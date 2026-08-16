(async () => {
    console.log("  [Starting Snatcher - ID MATCHING & 35 MIN RETRY MODE]  ");

    // 0. Prompt for folder and extract ONLY IDs (last 8 chars before .md)
    let downloadedIds = new Set();
    try {
        alert("Please select the folder where the downloaded chats are located.\n\nThe script will find them by their unique IDs and will not download them again. In case of a 429 error, the script will sleep for 35 minutes.");
        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                // Match pattern: underscore, 8 chars (a-f, 0-9), dot md
                const match = entry.name.match(/_([a-f0-9]{8})\.md$/);
                if (match && match[1]) {
                    downloadedIds.add(match[1]);
                }
            }
        }
        console.log(`[Analysis] Found ${downloadedIds.size} unique chat IDs in the folder. They will be skipped.`);
    } catch (e) {
        console.log("[Warning] Folder not selected or an error occurred. All chats will be downloaded.");
    }

    let token;
    try {
        const session = await fetch("/api/auth/session").then(r => r.json());
        token = session.accessToken;
        if (!token) throw new Error("No token");
    } catch (e) {
        alert("Authorization error. Please refresh the ChatGPT page and try again.");
        return;
    }

    const headers = { "Authorization": `Bearer ${token}` };
    let totalDownloaded = 0;
    let totalSkipped = 0;

    // --- FUNCTION WITH 35-MINUTE RETRY ON 429 ---
    async function fetchWithRetry(url, fileName, typeName, chatTitle, chatId) {
        let success = false;
        
        while (!success) {
            try {
                const resp = await fetch(url, { headers });
                
                // If rate limited (429) — wait 35 MINUTES
                if (resp.status === 429) {
                    const waitTimeMinutes = 35;
                    const waitTimeMs = waitTimeMinutes * 60 * 1000;
                    console.warn(`\n⛔ [429 Rate Limit] Server blocked requests.`);
                    console.warn(`Pausing for ${waitTimeMinutes} minutes. Please DO NOT close this tab!`);
                    console.warn(`Resume time: ${new Date(Date.now() + waitTimeMs).toLocaleTimeString()}`);
                    
                    await new Promise(r => setTimeout(r, waitTimeMs));
                    console.log(`[Resuming] Retrying to download ${fileName}...`);
                    continue; // Try again
                }

                if (!resp.ok) {
                    console.error(`[Error ${resp.status}] Failed to download ${fileName}.`);
                    break; 
                }

                const convData = await resp.json();
                
                if (!convData || !convData.mapping) {
                    console.error(`[Empty] Chat data for ${fileName} is empty. Skipping.`);
                    break;
                }

                const md = buildMarkdown(convData, chatTitle, typeName, chatId);
                downloadFile(fileName, md);
                totalDownloaded++;
                success = true;

                // Basic pause (5 seconds) between successful downloads
                await new Promise(r => setTimeout(r, 5000)); 

            } catch (err) {
                console.error(`[Network Error] Failed to download ${fileName}. Waiting 15 sec...`, err);
                await new Promise(r => setTimeout(r, 15000));
            }
        }
    }


    // --- 1. DOWNLOAD REGULAR CHATS ---
    console.log("\nFetching regular conversations...");
    let regularConvos = [];
    let offset = 0;
    const limit = 50;

    while (true) {
        const resp = await fetch(`/backend-api/conversations?offset=${offset}&limit=${limit}`, { headers });
        if (resp.status === 429) {
            console.warn(`[429 Rate Limit] Pausing for 35 mins while fetching chat list...`);
            await new Promise(r => setTimeout(r, 35 * 60 * 1000));
            continue;
        }
        const data = await resp.json();
        const items = data.items || [];
        regularConvos = regularConvos.concat(items);
        if (items.length < limit) break;
        offset += limit;
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`Found ${regularConvos.length} regular conversations.`);

    for (let i = 0; i < regularConvos.length; i++) {
        const conv = regularConvos[i];
        
        // Unique Chat ID (8 characters)
        const shortId = conv.id.split('-')[0]; 
        
        // Title normalization (only letters and numbers)
        const cleanTitle = (conv.title || "Untitled")
            .replace(/[^a-z0-9а-яё]/gi, '_') 
            .replace(/_+/g, '_')             
            .replace(/_$/, '')               
            .substring(0, 50);
            
        const fileName = `${cleanTitle}_${shortId}.md`;

        // MATCH ONLY BY UNIQUE ID (shortId)
        if (downloadedIds.has(shortId)) {
            console.log(`[Skipping ${i+1}/${regularConvos.length}] Chat with ID [${shortId}] is already in the folder.`);
            totalSkipped++;
            continue;
        }

        console.log(`[Downloading ${i+1}/${regularConvos.length}] ${fileName}`);
        await fetchWithRetry(`/backend-api/conversation/${conv.id}`, fileName, "Regular", conv.title || "Untitled", conv.id);
    }


    // --- 2. DOWNLOAD PROJECTS ---
    console.log("\n[snatcher] Now Fetching Projects!");
    let projects = [];

    try {
        const sidebarRes = await fetch("/backend-api/gizmos/snorlax/sidebar?owned_only=true", { headers });
        const data = await sidebarRes.json();
        if (data.items && Array.isArray(data.items)) {
            projects = data.items.map(item => {
                const gizmo = item?.gizmo?.gizmo || item?.gizmo;
                return gizmo ? { id: gizmo.id, name: gizmo.display?.name || gizmo.name || "Project" } : null;
            }).filter(Boolean);
        }
    } catch (e) {
        console.log("Projects not found or unavailable.");
    }

    for (let p = 0; p < projects.length; p++) {
        const project = projects[p];
        const cleanProjName = project.name.replace(/[^a-z0-9а-яё]/gi, '_').replace(/_+/g, '_').substring(0, 30);
        
        console.log(`\nProcessing Project: ${project.name}`);
        let convos = [];
        let cursor = "0";

        while (true) {
            const url = `/backend-api/gizmos/${encodeURIComponent(project.id)}/conversations?cursor=${cursor}`;
            const resp = await fetch(url, { headers });
            
            if (resp.status === 429) {
                console.warn(`[429 Rate Limit] Pausing 35 mins while fetching project list for ${project.name}...`);
                await new Promise(r => setTimeout(r, 35 * 60 * 1000));
                continue;
            }

            const data = await resp.json();
            const items = data.items || [];
            convos = convos.concat(items);
            if (!data.has_more || items.length === 0) break;
            cursor = data.next_cursor || "0";
            await new Promise(r => setTimeout(r, 2000));
        }

        for (let i = 0; i < convos.length; i++) {
            const conv = convos[i];
            const shortId = conv.id.split('-')[0];
            const cleanTitle = (conv.title || "Untitled").replace(/[^a-z0-9а-яё]/gi, '_').replace(/_+/g, '_').substring(0, 50);
            const fileName = `${cleanProjName}_${cleanTitle}_${shortId}.md`;

            // MATCH BY ID
            if (downloadedIds.has(shortId)) {
                console.log(`    [Skipping ${i+1}/${convos.length}] Chat with ID [${shortId}] is already in the folder.`);
                totalSkipped++;
                continue;
            }

            console.log(`    [Downloading ${i+1}/${convos.length}] ${fileName}`);
            await fetchWithRetry(`/backend-api/conversation/${conv.id}`, fileName, project.name, conv.title || "Untitled", conv.id);
        }
    }


    // --- HELPER FUNCTIONS ---
    function buildMarkdown(convData, title, source, id) {
        let md = `# ${title}\n**Source:** ${source}\n**Chat ID:** ${id}\n**Exported:** ${new Date().toLocaleString()}\n\n---\n\n`;
        const mapping = convData.mapping || {};
        let nodeId = convData.current_node;

        while (nodeId && mapping[nodeId]) {
            const node = mapping[nodeId];
            const msg = node.message;
            if (msg?.content?.parts) {
                const role = msg.author.role;
                const content = msg.content.parts.join("\n");
                md += (role === "user" ? "## User\n" : "## Assistant\n") + content + "\n\n";
            }
            nodeId = node.parent;
        }
        return md;
    }

    function downloadFile(filename, content) {
        const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    console.log(`\n[snatcher] FINISHED! Downloaded: ${totalDownloaded}. Skipped: ${totalSkipped}.`);
    alert(`Export completed!\nDownloaded: ${totalDownloaded}\nSkipped: ${totalSkipped}`);
})();
