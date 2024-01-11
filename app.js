const express = require('express');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const grayMatter = require('gray-matter');

const app = express();
const port = 3333;

const contentPath = path.join(__dirname, '/content');
const directoryTemplate = path.join(__dirname, '_templates/directory.html');
const fileTemplate = path.join(__dirname, "_templates/view.html");

function getNavBar(currentLocation) {
    let root = fs.readdirSync(contentPath);
    let navBar = '';

    navBar += '<nav>\n<ul>';
    for (let dir of root)
    {
        let location = path.join(contentPath, dir);
        if (fs.lstatSync(location).isDirectory()) {
            if (location.endsWith(currentLocation)) {
                navBar += `\n<li><a id="current" href="/${dir}">${dir}</a></li>`;
            } else {
                navBar += `\n<li><a href="/${dir}">${dir}</a></li>`;
            }
        }
    }
    navBar += '\n</ul>\n</nav>';

    return navBar;
}

app.get('/', (req, res) => {
    let homePage = fs.readFileSync(__dirname + "/index.html", 'utf-8');

    homePage = homePage.replace('{{nav}}', getNavBar(req.params[0]));
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
            let filePath = path.join(location, file);
            let fullPath = path.join(contentPath, filePath);

            if (file.endsWith('.md')) {
                notesFiles.push(file);
                continue;
            }

            filesList += `\n<li><a href="/view/${filePath}">`;
            
            if (fs.lstatSync(fullPath).isDirectory()) {
                let firstFile = fs.readdirSync(fullPath)[0];
                let previewPath = path.join(filePath, firstFile);

                filesList += `\n<figure><img src="${previewPath}"><figcaption>${file}</figcaption></figure>`;
            } else {
                filesList += file;
            }

            filesList += '</a></li>';
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
            sectionsHTML += `\n<section>`;
            sectionsHTML += `\n<h2>${tag}</h2>`;
            sectionsHTML += `\n<p>\n<ul>`;
            
            for (let note of tagSections[tag]) {
            sectionsHTML += `\n<li><a href="/view/${location}/${note["file"]}">${note["title"]}</a></li>`;
            }

            sectionsHTML += `\n</ul>\n</p>`;
            sectionsHTML += `\n</section>`;
        }

        template = template
            .replace('{{nav}}', getNavBar(location))
            .replaceAll('{{title}}', `${location}`)
            .replace('{{directory-list}}', `${filesList}`)
            .replace('{{notes}}', sectionsHTML);

        res.send(template);
    });
});

app.get('/view/*', (req, res) => {
    let itemName = req.params[0];
    let fullPath = path.join(contentPath, itemName);
    let template = fs.readFileSync(fileTemplate, 'utf-8');
    let title = '';
    let viewContents = '';

    if (fs.lstatSync(fullPath).isDirectory()) {
        let files = fs.readdirSync(fullPath);

        // Put all images into a list
        viewContents += "\n<ul>";
        for (let file of files) {
            if (file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".gif")) {
                viewContents += `\n<li><img src="/${path.join(itemName, file)}"></li>`;
            }
        }
        viewContents += "\n</ul>";
        title = itemName;
    } else {
        let fileContents = fs.readFileSync(fullPath, 'utf-8');
        let { data, content } = grayMatter(fileContents);
        let htmlContent = marked.parse(content);
        
        title = data.title || itemName;
        viewContents += `<section>${htmlContent}</section>`;
    }
    
    template = template
        .replace('{{nav}}', getNavBar(itemName.split("/")[0]))
        .replaceAll('{{title}}', title)
        .replace('{{content}}', viewContents);
    
    res.send(template);
});


// TODO: file upload in image directories
app.get('/upload/*', (req, res) => {

});

app.post('/post/*', (req, res) => {
    const postData = req.body;
});

app.use(express.static("public"));
app.use(express.static(contentPath));

app.listen(port, () => {
	console.log(`plica-garden is running at http://localhost:${port}`);
});