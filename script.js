document.addEventListener('DOMContentLoaded', async () => {
    const gameVersionSelect = document.getElementById('gameVersion');
    const modListDiv = document.getElementById('modList');

    const githubUser = 'dannyluck';
    const githubRepo = 'loadorder-db';
    const loadordersPath = 'loadorders';

    // Function to parse a single mod line (no change here)
    function parseModLine(line) {
        const fullMatch = line.match(/^\[(.*?)\]\((.*?)\)\s*\[(.*?)\]$/);
        if (fullMatch) {
            const modName = fullMatch[1];
            const modLink = fullMatch[2];
            const modVersion = fullMatch[3];
            return { modName, modLink, modVersion };
        }
        return null;
    }

    // Function to format the version number for display
    function formatVersionForDisplay(versionString) {
        // Assuming versions are like "154", "155", or "1_50" for "1.50"
        // We want to turn "154" into "1.54"
        // And "1_50" into "1.50" (if you ever use underscores)
        
        // Replace underscore with dot if present
        let formatted = versionString.replace('_', '.');

        // If it's a two-digit number like "54" from "154", add a dot
        // This is a simple heuristic; adjust if your version naming is more complex
        if (!formatted.includes('.') && formatted.length >= 2) {
            // Insert a dot before the last two characters
            formatted = formatted.slice(0, -2) + '.' + formatted.slice(-2);
        } else if (!formatted.includes('.') && formatted.length === 1) {
            // Handle cases like "1" to "1.00" if desired, though unlikely for game versions
            formatted = formatted + '.00'; 
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
            const response = await fetch(`https://raw.githubusercontent.com/${githubUser}/${githubRepo}/main/${loadordersPath}/loadorder${version}.txt`);
            
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

            modListDiv.innerHTML = '';

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
                    modNameSpan.textContent = mod.modName;
                    modItem.appendChild(modNameSpan);

                    const modLinkDiv = document.createElement('div');
                    modLinkDiv.classList.add('mod-link');
                    const linkButton = document.createElement('button');
                    linkButton.textContent = 'View Mod';
                    linkButton.onclick = () => window.open(mod.modLink, '_blank');
                    modLinkDiv.appendChild(linkButton);
                    modItem.appendChild(modLinkDiv);

                    const modVersionSpan = document.createElement('span');
                    modVersionSpan.classList.add('mod-version');
                    // Display the full version string from the file, as it already includes the dot
                    modVersionSpan.textContent = `Version: ${mod.modVersion}`;
                    modItem.appendChild(modVersionSpan);

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
                    // Custom sort for version strings like "154" vs "155" or "1_50"
                    const numA = parseFloat(a.replace('_', '.'));
                    const numB = parseFloat(b.replace('_', '.'));
                    return numA - numB;
                });
            
            // Clear existing options
            gameVersionSelect.innerHTML = '';

            if (rawVersions.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No versions found';
                gameVersionSelect.appendChild(option);
                modListDiv.innerHTML = '<p>No game versions found in the loadorders folder.</p>';
                return;
            }

            // Add new options, formatting the display text
            rawVersions.forEach(version => {
                const option = document.createElement('option');
                option.value = version; // The value remains "154" because the file is named loadorder154.txt
                option.textContent = formatVersionForDisplay(version); // Display "1.54"
                gameVersionSelect.appendChild(option);
            });

            // Set the first version as selected and load its mods
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
