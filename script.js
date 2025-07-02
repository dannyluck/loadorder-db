document.addEventListener('DOMContentLoaded', async () => {
    const gameVersionSelect = document.getElementById('gameVersion');
    const modListDiv = document.getElementById('modList');

    // Your GitHub username and repository name
    const githubUser = 'dannyluck'; // Replaced with your GitHub username
    const githubRepo = 'loadorder-db'; // Replaced with your repository name
    const loadordersPath = 'loadorders'; // Path to your loadorders folder

    // Function to parse a single mod line
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

    // Function to fetch and display the load order for a specific version
    async function loadOrder(version) {
        if (!version) {
            modListDiv.innerHTML = '<p>Please select a game version to display the load order.</p>';
            return;
        }
        modListDiv.innerHTML = '<p>Loading mods...</p>'; // Show loading message
        try {
            const response = await fetch(`https://raw.githubusercontent.com/${githubUser}/${githubRepo}/main/${loadordersPath}/loadorder${version}.txt`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    modListDiv.innerHTML = `<p>No load order file found for version ${version} in the 'loadorders' folder.</p>`;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return;
            }
            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim() !== ''); // Split by line and remove empty ones

            modListDiv.innerHTML = ''; // Clear previous content

            if (lines.length === 0) {
                modListDiv.innerHTML = `<p>The load order file for version ${version} in 'loadorders' is empty.</p>`;
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
                    linkButton.onclick = () => window.open(mod.modLink, '_blank'); // Open link in new tab
                    modLinkDiv.appendChild(linkButton);
                    modItem.appendChild(modLinkDiv);

                    const modVersionSpan = document.createElement('span');
                    modVersionSpan.classList.add('mod-version');
                    modVersionSpan.textContent = `Version: ${mod.modVersion}`;
                    modItem.appendChild(modVersionSpan);

                    modListDiv.appendChild(modItem);
                } else {
                    // Optional: Handle lines that don't match the expected format
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
            // Use GitHub API to list directory contents
            const apiUrl = `https://api.github.com/repos/${githubUser}/${githubRepo}/contents/${loadordersPath}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`GitHub API error! status: ${response.status} - ${response.statusText}`);
            }
            const files = await response.json();

            // Filter for .txt files and extract version numbers
            const versions = files
                .filter(file => file.type === 'file' && file.name.startsWith('loadorder') && file.name.endsWith('.txt'))
                .map(file => file.name.replace('loadorder', '').replace('.txt', ''))
                .sort((a, b) => parseFloat(a) - parseFloat(b)); // Sort numerically (e.g., 1.50 before 1.54)

            // Clear existing options
            gameVersionSelect.innerHTML = '';

            if (versions.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No versions found';
                gameVersionSelect.appendChild(option);
                modListDiv.innerHTML = '<p>No game versions found in the loadorders folder.</p>';
                return;
            }

            // Add new options to the select dropdown
            versions.forEach(version => {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version;
                gameVersionSelect.appendChild(option);
            });

            // Set the first version as selected and load its mods
            if (versions.length > 0) {
                gameVersionSelect.value = versions[0];
                loadOrder(versions[0]);
            }

        } catch (error) {
            console.error('Error populating game versions:', error);
            gameVersionSelect.innerHTML = '<option value="">Error loading versions</option>';
            modListDiv.innerHTML = `<p>Could not load game versions: ${error.message}. Please check your GitHub username/repository name and internet connection.</p>`;
        }
    }

    // Initial call to populate the versions dropdown when the page loads
    await populateVersions();

    // Event listener for when the game version changes
    gameVersionSelect.addEventListener('change', (event) => {
        const selectedVersion = event.target.value;
        loadOrder(selectedVersion);
    });
});
