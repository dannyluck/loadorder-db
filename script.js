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
            note: ''
        };

        const trimmedLine = line.trim();
        if (!trimmedLine) return null; // Skip empty lines

        // --- Rule 1: Check for UNAVAILABLE mods first (~~Mod Name~~ (unavailable...)) ---
        // This regex captures the strikethrough content and the optional unavailable note
        const unavailablePattern = /^~~(.*?)~~(?:\s*\((unavailable.*)\))?$/;
        let match = trimmedLine.match(unavailablePattern);
        if (match) {
            mod.unavailable = true;
            let contentInsideStrikethrough = match[1].trim();
            mod.note = match[2] ? `unavailable (${match[2].trim()})` : 'unavailable';

            // Try to extract version from the strikethrough content itself
            const versionInStrikethrough = contentInsideStrikethrough.match(/^(.*?)\s*\[([^\]]+)\]$/);
            if (versionInStrikethrough) {
                mod.name = versionInStrikethrough[1].trim();
                mod.version = versionInStrikethrough[2].trim();
            } else {
                mod.name = contentInsideStrikethrough;
            }
            return mod;
        }

        // --- Rule 2: Lines that start with '[' and end with ']' (Standard format with primary link) ---
        // Example: [Kovylkino Map](https://mods.to/CAbx685861824e875) [0.]
        // Example: [BXP RIW Tunisia](https://mods.to/IP3B67eea9f139b48) [154.0] ([INFO/README](https://pastebin.com/raw/tv9QXiTF))
        // Example: [KirovMap 1.7.1(1.54)](https://app.lava.top/products/8ad3e8ec-8fcd-401a-877b-4bd22cada769) [1.54]
        // This pattern needs to be flexible for optional AIO/INFO/Note suffixes.
        const fullLinkPattern = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*\[([^\]]+)\](?:\s*\(\[AIO\]\((https?:\/\/[^\s)]+)\))?(?:(?:\s*-\s*)?\(\[INFO\/README\]\((https?:\/\/[^\s)]+)\))?(?:\s*\(([^)]+)\))?$/;
        match = trimmedLine.match(fullLinkPattern);
        if (match) {
            mod.name = match[1].trim();
            mod.primaryLink = match[2];
            mod.version = match[3].trim();
            mod.aioLink = match[4] || '';
            mod.infoLink = match[5] || '';
            mod.note = match[6] ? match[6].trim() : '';
            return mod;
        }

        // --- Rule 3: Lines that start with a letter and contain AIO (No primary link, but AIO link) ---
        // Example: Heart of Africa [0.2] ([AIO](https://truckymods.io/euro-truck-simulator-2/maps/heart-of-africa))
        // Example: RIW 2.0 [2.0] ([AIO](https://truckymods.io/euro-truck-simulator-2/maps/road-into-wilderness))
        // Example: Road to Arkhangelsk VK RusMap Patch [1.2] ([AIO](https://truckymods.io/euro-truck-simulator-2/maps/road-to-arkhangelsk))
        const aioOnlyPattern = /^(.*?)\s*\[([^\]]+)\]\s*\(\[AIO\]\((https?:\/\/[^\s)]+)\)\)(?:\s*\(([^)]+)\))?$/;
        match = trimmedLine.match(aioOnlyPattern);
        if (match) {
            mod.name = match[1].trim();
            mod.version = match[2].trim();
            mod.aioLink = match[3];
            mod.note = match[4] ? match[4].trim() : '';
            return mod;
        }

        // --- Rule 4: Lines that start with a letter and end with ']' (No buttons) ---
        // Example: M12_vostok_V.2.1 [2.1]
        // Example: Heart of Africa Assets [0.2]
        // Example: Project Russia Models 5.6.2a [5.6.2a]
        const noLinkPattern = /^(.*?)\s*\[([^\]]+)\](?:\s*\(([^)]+)\))?$/; // Optional note at the end
        match = trimmedLine.match(noLinkPattern);
        if (match) {
            mod.name = match[1].trim();
            mod.version = match[2].trim();
            mod.note = match[3] ? match[3].trim() : '';
            return mod;
        }

        // --- Fallback: Simple Mod Name (if no other pattern matches, e.g., "Kalybay - a lost Road to Aral city") ---
        // This should be the last resort.
        if (trimmedLine !== '') {
            mod.name = trimmedLine;
            return mod;
        }

        return null; // If nothing matches
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
                
                // --- Skip unavailable mods ---
                if (mod && mod.unavailable) {
                    return; // Skip to the next line in the loop
                }

                if (mod && mod.name) { // Ensure mod object is valid and has a name
                    const modItem = document.createElement('div');
                    modItem.classList.add('mod-item');

                    const modNameSpan = document.createElement('span');
                    modNameSpan.classList.add('mod-name');
                    modNameSpan.textContent = mod.name;

                    // --- REMOVED: AIO indicator text here ---
                    // The AIO button already provides sufficient indication.

                    if (mod.note) { // Append note if it exists (and it won't be "unavailable" due to the skip above)
                         modNameSpan.textContent += ` (${mod.note})`;
                    }
                    
                    modItem.appendChild(modNameSpan);

                    const modLinksDiv = document.createElement('div');
                    modLinksDiv.classList.add('mod-links-container');


                    // Primary Link Button
                    if (mod.primaryLink) {
                        const linkButton = document.createElement('button');
                        linkButton.classList.add('mod-link-button');
                        linkButton.textContent = 'View Mod';
                        linkButton.onclick = () => window.open(mod.primaryLink, '_blank');
                        modLinksDiv.appendChild(linkButton);
                    }

                    // AIO Link Button
                    if (mod.aioLink) {
                        const aioButton = document.createElement('button');
                        aioButton.classList.add('mod-link-button', 'aio-button');
                        aioButton.textContent = 'AIO Download';
                        aioButton.onclick = () => window.open(mod.aioLink, '_blank');
                        modLinksDiv.appendChild(aioButton);
                    }

                    // INFO/README Link Button
                    if (mod.infoLink) {
                        const infoButton = document.createElement('button');
                        infoButton.classList.add('mod-link-button', 'info-button');
                        infoButton.textContent = 'Info/README';
                        infoButton.onclick = () => window.open(mod.infoLink, '_blank');
                        modLinksDiv.appendChild(infoButton);
                    }
                    
                    if (modLinksDiv.children.length > 0) {
                        modItem.appendChild(modLinksDiv);
                    }

                    // Mod Version
                    if (mod.version) {
                        const modVersionSpan = document.createElement('span');
                        modVersionSpan.classList.add('mod-version');
                        modVersionSpan.textContent = `Version: ${mod.version}`;
                        modItem.appendChild(modVersionSpan);
                    } else { // If no version found and not unavailable, show placeholder
                        const modVersionSpan = document.createElement('span');
                        modVersionSpan.classList.add('mod-version');
                        modVersionSpan.textContent = `Version: N/A`;
                        modItem.appendChild(modVersionSpan);
                    }

                    modListDiv.appendChild(modItem);
                } else {
                    console.warn(`Skipping malformed line: "${line}"`);
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

            const rawVersions = files
                .filter(file => file.type === 'file' && file.name.startsWith('loadorder') && file.name.endsWith('.txt'))
                .map(file => file.name.replace('loadorder', '').replace('.txt', ''))
                .sort((a, b) => {
                    const numA = parseFloat(a.replace(/_/g, '.'));
                    const numB = parseFloat(b.replace(/_/g, '.'));
                    return numA - numB;
                });
            
            gameVersionSelect.innerHTML = '';

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
                option.value = version;
                option.textContent = formatVersionForDisplay(version);
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
