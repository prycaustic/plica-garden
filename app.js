const express = require('express');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const grayMatter = require('gray-matter');
const multer = require('multer');

const app = express();
const port = 3333;

const contentPath = path.join(__dirname, '/content');
const directoryTemplate = path.join(__dirname, '_templates/directory.html');
const fileTemplate = path.join(__dirname, "_templates/view.html");

function getNavBar(currentLocation) {
    let root = fs.readdirSync(contentPath);
    let navBar = '';

    navBar += '<nav>\n<ul>';
    // Link for home page
    if (currentLocation === undefined) {
        navBar += '\n<li><a id="current" href="/">home</a></li>';
    } else {
        navBar += '\n<li><a href="/">home</a></li>';
    }
    // Everything else
    for (let dir of root)
    {
        let location = path.join(contentPath, dir);
        if (dir.startsWith('.')) continue;
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
            res.status(err.code);
            return;
        }

        if (!stats.isDirectory()) {
            res.status(404).send("Location not found.");
            return;
        }

        let contents = fs.readdirSync(locationPath);
        let notesFiles = [];

        // Go through generic files
        filesList += '\n<ul class="link-list">';
        for (let file of contents) {
            let filePath = path.join(location, file);
            let fullPath = path.join(contentPath, filePath);

            if (file.endsWith('.md')) {
                notesFiles.push(file);
                continue;
            }

            if (file.startsWith('_assets')) continue;
            
            if (fs.lstatSync(fullPath).isDirectory()) {
                let firstFile = fs.readdirSync(fullPath)[0];
                if (firstFile.endsWith('.md')) continue;
                let previewPath = path.join(filePath, firstFile);

                filesList += `\n<li>\n<a href="/view/${filePath}">`;
                filesList += `\n<figure>\n<img src="${previewPath}">\n<figcaption>${file.replace('-', ' ')}</figcaption>\n</figure>`;
                filesList += '\n</a>\n</li>';
            } else {
                filesList += `\n<li>\n<a href="/view/${filePath}">${file}\n</a>\n</li>`;
            }

        }
        filesList += '\n</ul>';

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
            sectionsHTML += `\n<p>\n<ul class="link-list">`;
            
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
        // TODO: sort images by modified date
        let files = fs.readdirSync(fullPath);
        let numColumns = 4;
        let columns = Array.from({ length: numColumns }, () => '\n<ul class="image-list">');

        // Put images into columns
        viewContents += '\n<section class="moodboard">';
        files.forEach((file, index) => {
            let columnIndex = index % numColumns;
            let listItems = '';

            if (file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".gif")) {
                listItems = `\n<li><img src="/${path.join(itemName, file)}" onclick="openModal(this.src)" loading="lazy"></li>`;
            }

            columns[columnIndex] += listItems;
        })
        columns.forEach((column) => viewContents += column + '\n</ul>');
        viewContents += '\n</section>';
        title = itemName;
    } else {
        let fileContents = fs.readFileSync(fullPath, 'utf-8');
        let { data, content } = grayMatter(fileContents);
        let replacedContent = content.replaceAll(/\[([^\]]+)\]\((\/[^\)]+)\)/g, '[$1](/view$2.md)');
        let htmlContent = marked.parse(replacedContent);

        title = data.title || itemName;
        viewContents += `<section>${htmlContent}</section>`;
    }
    
    template = template
        .replace('{{nav}}', getNavBar(itemName.split("/")[0]))
        .replaceAll('{{title}}', title)
        .replace('{{content}}', viewContents);
    
    res.send(template);
});

// TODO: make this upload the file to the correct directory???
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Extract relevant part of the URL and construct the destination path
        let urlParts = req.url.replace('/upload', '/content').split('/').filter(Boolean);
        let destinationPath = path.join(__dirname, ...urlParts);

        require('fs').mkdirSync(destinationPath, { recursive: true });

        // Call the callback with the custom destination path
        cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
        // Use the original file name for the uploaded file
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

app.post('/upload/*', upload.single('file'), (req, res) => {
    console.log('File uploaded: ', req.file);
    res.json({ message: 'File uploaded successfully' });
});

app.post('/post/*', (req, res) => {
    const postData = req.body;
});

app.use(express.static("public"));
app.use(express.static(contentPath));

app.listen(port, () => {
    console.log(`plica-garden is running at http://localhost:${port}`);
});