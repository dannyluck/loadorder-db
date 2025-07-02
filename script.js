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

        // Trim the line to remove leading/trailing whitespace
        const trimmedLine = line.trim();

        // 1. Check for unavailable mods first (~~Mod Name~~ (unavailable))
        const unavailableMatch = trimmedLine.match(/^~~(.*?)(\s*\[.*?\])?~~(?:\s*\((unavailable.*)\))?$/);
        if (unavailableMatch) {
            mod.unavailable = true;
            mod.name = unavailableMatch[1].trim();
            if (unavailableMatch[3]) { // Check if the full note like "unavailable - unofficial..." exists
                mod.note = 'unavailable ' + unavailableMatch[3].trim();
            } else if (unavailableMatch[2]) { // If only "[Version]" was part of the strikethrough, it's just unavailable
                mod.note = 'unavailable';
            } else {
                mod.note = 'unavailable'; // Default unavailable note
            }

            // Attempt to extract version if it's within the strikethrough text, e.g., "~~Mod Name [Version]~~"
            const versionInStrikethrough = mod.name.match(/^(.*?)\s*\[([^\]]+)\]$/);
            if (versionInStrikethrough) {
                mod.name = versionInStrikethrough[1].trim();
                mod.version = versionInStrikethrough[2].trim();
            }
            return mod;
        }

        // Define common optional suffixes to simplify regexes
        // These need to be non-greedy and match from the end of the line
        const aioSuffix = '(?:\s*\\(\\[AIO\\]\\((https?://[^\\s)]+)\\)\\))?';
        const infoSuffix = '(?:\s*\\(\\[INFO\\/README\\]\\((https?://[^\\s)]+)\\)\\))?';
        const noteSuffix = '(?:\\s*\\(([^)]+)\\))?'; // Captures any text in parentheses at the end

        // Combine suffixes for convenience, order matters for parsing
        const allSuffixes = `${aioSuffix}${infoSuffix}${noteSuffix}`;


        // 2. Pattern: [Mod Name](PrimaryLink) [Version] [Suffixes]
        // Example: [FLD Patch](https://truckymods.io/euro-truck-simulator-2/map-patches/fld-patch) [1.54-1.1.2]
        // Example: [BXP RIW Tunisia](https://mods.to/IP3B67eea9f139b48) [154.0] ([INFO/README](https://pastebin.com/raw/tv9QXiTF))
        let match = trimmedLine.match(
            new RegExp(`^\\[([^\\]]+)\\]\\((https?://[^\\s)]+)\\)\\s*\\[([^\\]]+)\\]${aioSuffix}${infoSuffix}${noteSuffix}$`)
        );
        if (match) {
            mod.name = match[1].trim();
            mod.primaryLink = match[2];
            mod.version = match[3].trim();
            mod.aioLink = match[4] || '';
            mod.infoLink = match[5] || '';
            mod.note = match[6] ? match[6].trim() : '';
            return mod;
        }

        // 3. Pattern: Mod Name [Version] [Suffixes] (NO primary link, name is not in brackets)
        // Example: Heart of Africa [0.2] ([AIO](https://truckymods.io/euro-truck-simulator-2/maps/heart-of-africa))
        // Example: Heart of Africa Assets [0.2]
        // The key is to ensure the name part does not greedily consume the AIO/INFO/Note parts.
        match = trimmedLine.match(
            new RegExp(`^(.*?)\\s*\\[([^\\]]+)\\]${aioSuffix}${infoSuffix}${noteSuffix}$`)
        );
        if (match) {
            mod.name = match[1].trim();
            mod.version = match[2].trim();
            mod.aioLink = match[3] || '';
            mod.infoLink = match[4] || '';
            mod.note = match[5] ? match[5].trim() : '';
            return mod;
        }

        // 4. Fallback: Simple Mod Name (if no version or links)
        // Example: Mod Name Only (unlikely based on your file, but good for robustness)
        if (trimmedLine !== '') {
            mod.name = trimmedLine;
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
                } else if (formatted.length === 2) { // e.g. "02" to "0.2" -> assumes 0.X
                    formatted = '0.' + formatted;
                } else if (formatted.length === 1) { // e.g. "1" to "1.00" or "0.1" (less likely for game versions)
                    formatted = formatted + '.00'; // Default to X.00 if single digit, or adjust as needed
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
                if (mod && mod.name) { // Ensure mod object is valid and has a name
                    const modItem = document.createElement('div');
                    modItem.classList.add('mod-item');

                    const modNameSpan = document.createElement('span');
                    modNameSpan.classList.add('mod-name');
                    modNameSpan.textContent = mod.name;

                    if (mod.note) {
                         // Only append note if it's not simply "unavailable" (as that's handled by strikethrough)
                         if (mod.note !== 'unavailable') {
                            modNameSpan.textContent += ` (${mod.note})`;
                         }
                    }

                    if (mod.unavailable) {
                        modItem.classList.add('mod-unavailable');
                        // Strikethrough is handled by CSS class, no need for inline style here.
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
                    } else if (!mod.unavailable) {
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
