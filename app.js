const express = require('express');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const grayMatter = require('gray-matter');
const multer = require('multer');
var favicon = require('serve-favicon')


const app = express();
const port = 3333;

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

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

            if (file.startsWith('.')) continue;
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
    let location = req.params[0];
    let fullPath = path.join(contentPath, location);
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
            let imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            let videoExtensions = ['.mp4', '.mov', '.mkv', '.m4v', '.webm'];
            let columnIndex = index % numColumns;
            let listItem = '';

            if (imageExtensions.some(ext => file.endsWith(ext))) {
                listItem += `\n<li>\n<img src="/${path.join(location, file)}" onclick="openImage(this.src)" loading="lazy" alt="${file}"/>`;
            }

            if (videoExtensions.some(ext => file.endsWith(ext))) {
                listItem += `\n<li class="video-with-filename" title="${file}"><video onclick="openVideo(this)" preload="metadata"><source src="/${path.join(location, file)}" /></video>`;
                listItem += `\n<p>${file}</p>`;
            }

            listItem += `\n<button class="delete-button" onclick="deleteFile(this, '${path.join(location, file)}')" title="Delete">&#10006;</button></li>`;

            columns[columnIndex] += listItem;
        })
        columns.forEach((column) => viewContents += column + '\n</ul>');
        viewContents += '\n</section>';
        title = location;
    } else {
        let fileContents = fs.readFileSync(fullPath, 'utf-8');
        let { data, content } = grayMatter(fileContents);
        let replacedContent = content.replaceAll(/\[([^\]]+)\]\((\/[^\)]+)\)/g, '[$1](/view$2.md)');
        let htmlContent = marked.parse(replacedContent);

        title = data.title || location;
        viewContents += `<section>${htmlContent}</section>`;
    }
    
    template = template
        .replace('{{nav}}', getNavBar(location.split("/")[0]))
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

app.delete('/delete/*', (req, res) => {
    let filePath = path.join(contentPath, req.params[0]);
    console.log(filePath);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500);
        }

        res.status(200).send('File deleted successfully');
    });
});

app.use(express.static("public"));
app.use(express.static(contentPath));

app.listen(port, () => {
    console.log(`plica-garden is running at http://localhost:${port}`);
});