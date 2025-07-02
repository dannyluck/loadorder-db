document.addEventListener('DOMContentLoaded', async () => {
    const gameVersionSelect = document.getElementById('gameVersion');
    const modListDiv = document.getElementById('modList');

    const githubUser = 'dannyluck';
    const githubRepo = 'loadorder-db';
    const loadordersPath = 'loadorders';
    const githubBranch = 'main'; // Or 'master' if that's your default branch

    // Function to parse a single mod line
    function parseModLine(line) {
        let mod = {
            name: '',
            primaryLink: '',
            version: '',
            aioLink: '',
            infoLink: '',
            unavailable: false,
            note: '' // For "paid mod" or "unofficial reuploads" notes
        };

        // Check for unavailable mods first (~~Mod Name~~ (unavailable))
        const unavailableMatch = line.match(/^~~(.*?)(\s*\[.*?\])?~~(\s*\((unavailable.*)\))?$/);
        if (unavailableMatch) {
            mod.name = unavailableMatch[1].trim();
            mod.unavailable = true;
            if (unavailableMatch[4]) {
                mod.note = unavailableMatch[4]; // Capture the "unavailable - unofficial reuploads can be found" part
            } else if (unavailableMatch[3]) {
                mod.note = 'unavailable';
            }
            // Try to extract version even if unavailable
            const versionInNameMatch = mod.name.match(/^(.*?)(\s*\[(.*?)\])$/);
            if (versionInNameMatch) {
                mod.name = versionInNameMatch[1].trim();
                mod.version = versionInNameMatch[3].trim();
            }
            return mod;
        }

        // Regex for the most complex line: [Name](PrimaryLink) [Version] ([AIO](AIO Link)) ([INFO/README](Info Link)) (Note)
        // This is tricky because the order of (AIO) and (INFO/README) or (Note) can vary,
        // and some parts might be missing. We'll try to capture main parts, then additional.

        // Pattern 1: [Name](Link) [Version] (with optional AIO/INFO/Note)
        let match = line.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*\[([^\]]+)\](?:\s*\(\[AIO\]\((https?:\/\/[^\s)]+)\))?(?:\s*\(\[INFO\/README\]\((https?:\/\/[^\s)]+)\))?(?:\s*\((.*)\))?$/);
        if (match) {
            mod.name = match[1].trim();
            mod.primaryLink = match[2];
            mod.version = match[3].trim();
            if (match[4]) mod.aioLink = match[4];
            if (match[5]) mod.infoLink = match[5];
            if (match[6]) mod.note = match[6].trim();
            return mod;
        }

        // Pattern 2: Name [Version] (with optional AIO/INFO/Note, no primary link)
        match = line.match(/^(.*?)\s*\[([^\]]+)\](?:\s*\(\[AIO\]\((https?:\/\/[^\s)]+)\))?(?:\s*\(\[INFO\/README\]\((https?:\/\/[^\s)]+)\))?(?:\s*\((.*)\))?$/);
        if (match) {
            mod.name = match[1].trim();
            mod.version = match[2].trim();
            if (match[3]) mod.aioLink = match[3];
            if (match[4]) mod.infoLink = match[4];
            if (match[5]) mod.note = match[5].trim();
            return mod;
        }
        
        // Pattern 3: Name (No version, no link, often for "assets" type mods if they ever exist like this)
        // This is less common based on your file, but good for robustness.
        // Example: Heart of Africa Assets [0.2] is caught by Pattern 2.
        // If there was "Mod Name" only, it would get caught here.
        if (line.trim() !== '') {
             mod.name = line.trim();
             return mod;
        }

        return null; // If no pattern matches, return null
    }

    // Function to format the version number for display
    function formatVersionForDisplay(versionString) {
        if (!versionString) return '';
        let formatted = versionString.replace(/_/g, '.'); // Replace all underscores with dots

        // Only add dot if it seems like a number without one (e.g., "154" -> "1.54")
        if (!formatted.includes('.') && formatted.length >= 2) {
            // Check if it's a number string
            if (/^\d+$/.test(formatted)) {
                 // Insert a dot before the last two characters (e.g., "154" becomes "1.54")
                if (formatted.length > 2) {
                    formatted = formatted.slice(0, -2) + '.' + formatted.slice(-2);
                } else if (formatted.length === 2) { // e.g. "02" to "0.2"
                    formatted = '0.' + formatted;
                }
            }
        }
        return formatted;
    }

    // Function to fetch and display the load order for a specific version
    async function loadOrder(version) {
        if (!version) {
            modListDiv.innerHTML = '<p>Please select a game version to display the load order.</p>';
            return;
        }
        modListDiv.innerHTML = '<p>Loading mods...</p>';
        try {
            // Use the raw.githubusercontent.com path
            const response = await fetch(`https://raw.githubusercontent.com/${githubUser}/${githubRepo}/${githubBranch}/${loadordersPath}/loadorder${version}.txt`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    modListDiv.innerHTML = `<p>No load order file found for version ${formatVersionForDisplay(version)} in the 'loadorders' folder.</p>`;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return;
            }
            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim() !== '');

            modListDiv.innerHTML = ''; // Clear previous content

            if (lines.length === 0) {
                modListDiv.innerHTML = `<p>The load order file for version ${formatVersionForDisplay(version)} in 'loadorders' is empty.</p>`;
                return;
            }

            lines.forEach(line => {
                const mod = parseModLine(line);
                if (mod) {
                    const modItem = document.createElement('div');
                    modItem.classList.add('mod-item');

                    const modNameSpan = document.createElement('span');
                    modNameSpan.classList.add('mod-name');
                    modNameSpan.textContent = mod.name;

                    if (mod.note) { // Append any notes like "paid mod" or "unavailable"
                         modNameSpan.textContent += ` (${mod.note})`;
                    }
                    if (mod.unavailable) {
                        modItem.classList.add('mod-unavailable'); // Add a class for unavailable styling
                        modNameSpan.style.textDecoration = 'line-through'; // Strikethrough for unavailable
                    }
                    modItem.appendChild(modNameSpan);

                    const modLinksDiv = document.createElement('div'); // Container for all links/buttons
                    modLinksDiv.classList.add('mod-links-container');


                    // Primary Link Button
                    if (mod.primaryLink) {
                        const linkButton = document.createElement('button');
                        linkButton.classList.add('mod-link-button'); // New class for buttons
                        linkButton.textContent = 'View Mod';
                        linkButton.onclick = () => window.open(mod.primaryLink, '_blank');
                        modLinksDiv.appendChild(linkButton);
                    }

                    // AIO Link Button
                    if (mod.aioLink) {
                        const aioButton = document.createElement('button');
                        aioButton.classList.add('mod-link-button', 'aio-button'); // Add aio-button class for distinct styling
                        aioButton.textContent = 'AIO Download';
                        aioButton.onclick = () => window.open(mod.aioLink, '_blank');
                        modLinksDiv.appendChild(aioButton);
                    }

                    // INFO/README Link Button
                    if (mod.infoLink) {
                        const infoButton = document.createElement('button');
                        infoButton.classList.add('mod-link-button', 'info-button'); // Add info-button class for distinct styling
                        infoButton.textContent = 'Info/README';
                        infoButton.onclick = () => window.open(mod.infoLink, '_blank');
                        modLinksDiv.appendChild(infoButton);
                    }
                    
                    if (modLinksDiv.children.length > 0) { // Only append if there are buttons
                        modItem.appendChild(modLinksDiv);
                    }

                    // Mod Version
                    if (mod.version) {
                        const modVersionSpan = document.createElement('span');
                        modVersionSpan.classList.add('mod-version');
                        modVersionSpan.textContent = `Version: ${mod.version}`;
                        modItem.appendChild(modVersionSpan);
                    } else if (!mod.unavailable) { // If no version found but not unavailable, show placeholder
                        const modVersionSpan = document.createElement('span');
                        modVersionSpan.classList.add('mod-version');
                        modVersionSpan.textContent = `Version: N/A`;
                        modItem.appendChild(modVersionSpan);
                    }


                    modListDiv.appendChild(modItem);
                } else {
                    console.warn(`Skipping malformed line: ${line}`);
                }
            });
        } catch (error) {
            console.error('Error loading the mod order:', error);
            modListDiv.innerHTML = `<p>Error loading the mod order: ${error.message}</p>`;
        }
    }

    // Function to dynamically add options to the select dropdown by fetching from GitHub API
    async function populateVersions() {
        try {
            const apiUrl = `https://api.github.com/repos/${githubUser}/${githubRepo}/contents/${loadordersPath}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`GitHub API error! status: ${response.status} - ${response.statusText}`);
            }
            const files = await response.json();

            // Filter for .txt files and extract version numbers (e.g., "154")
            const rawVersions = files
                .filter(file => file.type === 'file' && file.name.startsWith('loadorder') && file.name.endsWith('.txt'))
                .map(file => file.name.replace('loadorder', '').replace('.txt', ''))
                .sort((a, b) => {
                    // Custom sort for version strings like "154" vs "1_50" (convert to float for comparison)
                    const numA = parseFloat(a.replace(/_/g, '.'));
                    const numB = parseFloat(b.replace(/_/g, '.'));
                    return numA - numB;
                });
            
            gameVersionSelect.innerHTML = ''; // Clear existing options

            if (rawVersions.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No versions found';
                gameVersionSelect.appendChild(option);
                modListDiv.innerHTML = '<p>No game versions found in the loadorders folder.</p>';
                return;
            }

            rawVersions.forEach(version => {
                const option = document.createElement('option');
                option.value = version; // The value remains "154" for file fetching
                option.textContent = formatVersionForDisplay(version); // Display "1.54"
                gameVersionSelect.appendChild(option);
            });

            if (rawVersions.length > 0) {
                gameVersionSelect.value = rawVersions[0];
                loadOrder(rawVersions[0]);
            }

        } catch (error) {
            console.error('Error populating game versions:', error);
            gameVersionSelect.innerHTML = '<option value="">Error loading versions</option>';
            modListDiv.innerHTML = `<p>Could not load game versions: ${error.message}. Please check your GitHub username/repository name and internet connection.</p>`;
        }
    }

    await populateVersions();

    gameVersionSelect.addEventListener('change', (event) => {
        const selectedVersion = event.target.value;
        loadOrder(selectedVersion);
    });
});
