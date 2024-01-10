const express = require('express');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const grayMatter = require('gray-matter');

const app = express();
const port = 3333;

const contentPath = path.join(__dirname, '/content');
directoryTemplate = path.join(__dirname, '_templates/directory.html');

app.get('/', (req, res) => {
    let homePage = fs.readFileSync(__dirname + "/index.html", 'utf-8');
    let root = fs.readdirSync(contentPath);
    let navBar = '';

    for (let dir of root)
    {
        let location = path.join(contentPath, dir);
        if (fs.lstatSync(location).isDirectory()) {
            navBar += `<li><a href="/${dir}">${dir}</a></li>`;
        }
    }

    homePage = homePage.replace('<ul id="content-directory"></ul>', `<ul id="content-directory">${navBar}</ul>`);

	res.send(homePage);
});

app.get('/:location', (req, res) => {
    let { location } = req.params;
    let locationPath = path.join(contentPath, location);
    let template = fs.readFileSync(directoryTemplate, 'utf-8');
    let filesList = '';

    fs.lstat(locationPath, (err, stats) => {
        if (err) {
            res.status(err.code).send(err.message);
            return;
        }

        if (!stats.isDirectory()) {
            res.status(404).send("Location not found.");
            return;
        }

        let contents = fs.readdirSync(locationPath);
        let notesFiles = [];

        // Go through generic files
        for (let file of contents) {
            if (file.endsWith('.md')) {
                notesFiles.push(file);
                continue;
            }
            filesList += `\n<li><a href="/view/${path.join(locationPath, file)}">${file}</a></li>`;
        }

        let tagSections = {};

        // Organize notes by tags
        for (let file of notesFiles) {
            let filePath = path.join(locationPath, file);
            if (fs.statSync(filePath).isDirectory()) continue;
            let noteContents = fs.readFileSync(filePath, 'utf-8');
            let { data } = grayMatter(noteContents);
    
            // Get the tags as an array, thanks GPT
            let tags = Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',').map(tag => tag.trim()) : []);
    
            tags.forEach(tag => {
                if (!tagSections[tag]) {
                    tagSections[tag] = [];
                }
                tagSections[tag].push({"file": file, "title": data.title});
            })
        }

        let sectionsHTML = '';

        for (let tag of Object.keys(tagSections)) {
            sectionsHTML += `<section>`;
            sectionsHTML += `<h2>${tag}</h2>`;
            sectionsHTML += `<ul>`;
            
            for (let note of tagSections[tag]) {
            sectionsHTML += `<li><a href="/view/${location}/${path.basename(note["file"], '.md')}">${note["title"]}</a></li>`;
            }

            sectionsHTML += `</ul>`;
            sectionsHTML += `</section>`;
        }

        template = template
            .replace('{{title}}', `<h1>${location}</h1>`)
            .replace('<ul id="location-directory"></ul>', `<ul id="location-directory">${filesList}</ul>`)
            .replace('{{notes}}', sectionsHTML);

        res.send(template);
    });
});

app.get('/view/*', (req, res) => {
    let filename = req.params[0];
    res.send(filename);
})

app.use(express.static("public"));

app.listen(port, () => {
	console.log(`plica-garden is running at http://localhost:${port}`);
});