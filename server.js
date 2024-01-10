const express = require('express');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const grayMatter = require('gray-matter');

const app = express();
const port = 3333;

directoryTemplate = path.join(__dirname, '_templates/directory.html');

// NOTES
const notesPath = path.join(__dirname, 'content/notes');
const notesTemplate = path.join(__dirname, '_templates/note.html');

app.get('/notes', (req, res) => {
	const notesFiles = fs.readdirSync(notesPath);
	// Notes will be grouped by tag
	const tagSections = {};

	for (const file of notesFiles) {
		const filePath = path.join(notesPath, file);
		if (fs.statSync(filePath).isDirectory()) continue;
		const noteContents = fs.readFileSync(filePath, 'utf-8');
		const { data } = grayMatter(noteContents);

		// Get the tags as an array, thanks GPT
		const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',').map(tag => tag.trim()) : []);

		tags.forEach(tag => {
			if (!tagSections[tag]) {
				tagSections[tag] = [];
			}
			tagSections[tag].push({"file": file, "title": data.title});
		})
	}

	let sectionsHTML = '';

    for (const tag of Object.keys(tagSections)) {
      sectionsHTML += `<section>`;
      sectionsHTML += `<h2>${tag}</h2>`;
      sectionsHTML += `<ul>`;
      
      for (const note of tagSections[tag]) {
        sectionsHTML += `<li><a href="/notes/${path.basename(note["file"], '.md')}">${note["title"]}</a></li>`;
      }

      sectionsHTML += `</ul>`;
      sectionsHTML += `</section>`;
    }

	res.send(`
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Notes Directory</title>
		</head>
		<body>
			<h1>Notes Directory</h1>
			${sectionsHTML}
		</body>
		</html>
	`);
});
  
app.get('/notes/:filename', async (req, res) => {
	const { filename } = req.params;
	const filePath = path.join(notesPath, `${filename}.md`);
	const noteContents = fs.readFileSync(filePath, 'utf-8');
	const { data, content } = grayMatter(noteContents);
	const noteName = data.title || filename;
	const htmlContent = marked.parse(content);
	
	fs.readFile(notesTemplate, 'utf-8', (err, templateContent) => {
		if (err) {
			res.status(500).send('Internal Server Error');
			return;
		}

		// Insert the moodboard name and gallery HTML into the template
		const updatedTemplate = templateContent
			.replace('<title id="note-title"></title>', `<title>${noteName}</title>`)
			.replace('<h1 id="note-name"></h1>', `<h1 id="note-name">${noteName}</h1>`)
			.replace('<div id="markdown"></div>', `<div>${htmlContent}</div>`);

		// Send the updated HTML
		res.send(updatedTemplate);
	});
});

// BOOKMARKS
const bookmarksPath = path.join(__dirname, 'content/bookmarks');
const bookmarksTemplate = path.join(__dirname, '_templates/note.html');

app.get('/bookmarks', (req, res) => {
	const notesFiles = fs.readdirSync(bookmarksPath);
	// Notes will be grouped by tag
	const tagSections = {};

	for (const file of notesFiles) {
		const filePath = path.join(bookmarksPath, file);
		if (fs.statSync(filePath).isDirectory()) continue;
		const noteContents = fs.readFileSync(filePath, 'utf-8');
		const { data } = grayMatter(noteContents);

		// Get the tags as an array, thanks GPT
		const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',').map(tag => tag.trim()) : []);

		tags.forEach(tag => {
			if (!tagSections[tag]) {
				tagSections[tag] = [];
			}
			tagSections[tag].push({"file": file, "title": data.title});
		})
	}

	let sectionsHTML = '';

    for (const tag of Object.keys(tagSections)) {
      sectionsHTML += `<section>`;
      sectionsHTML += `<h2>${tag}</h2>`;
      sectionsHTML += `<ul>`;
      
      for (const note of tagSections[tag]) {
        sectionsHTML += `<li><a href="/bookmarks/${path.basename(note["file"], '.md')}">${note["title"]}</a></li>`;
      }

      sectionsHTML += `</ul>`;
      sectionsHTML += `</section>`;
    }

	let templateContent = fs.readFileSync(directoryTemplate, 'utf-8');
	let updatedTemplate = templateContent
		.replace('<h1></h1>', '<h1>Bookmarks</h1>')
		.replace('<ul></ul>', sectionsHTML);

	res.send(updatedTemplate);
});

  
app.get('/bookmarks/:filename', async (req, res) => {
	const { filename } = req.params;
	const filePath = path.join(bookmarksPath, `${filename}.md`);
	const noteContents = fs.readFileSync(filePath, 'utf-8');
	const { data, content } = grayMatter(noteContents);
	const noteName = data.title || filename;
	const htmlContent = marked.parse(content);
	
	fs.readFile(bookmarksTemplate, 'utf-8', (err, templateContent) => {
		if (err) {
			res.status(500).send('Internal Server Error');
			return;
		}

		// Insert the moodboard name and gallery HTML into the template
		const updatedTemplate = templateContent
			.replace('<title id="note-title"></title>', `<title>${noteName}</title>`)
			.replace('<h1 id="note-name"></h1>', `<h1 id="note-name">${noteName}</h1>\r\n<a href="${data.source}">Original article</a>`)
			.replace('<div id="markdown"></div>', `<div>${htmlContent}</div>`);

		// Send the updated HTML
		res.send(updatedTemplate);
	});
});

// MOODBOARDS
const moodboardsDirectory = path.join(__dirname, 'content/moodboards');
const moodboardsTemplate = path.join(__dirname, '_templates/moodboard.html');

// Serve static files (images) from the moodboards directory
app.use('/moodboards', express.static(moodboardsDirectory));

app.get('/moodboards', (req, res) => {
	// Read the moodboards directory to get a list of moodboard names
	fs.readdir(moodboardsDirectory, (err, moodboards) => {
		if (err) {
			res.status(500).send('Internal Server Error');
			return;
		}
	
		// Create an HTML list of moodboards with links
		const moodboardList = moodboards
			.map(moodboard => `<li><a href="/moodboards/${moodboard}">${moodboard}</a></li>`)
			.join('');

		let templateContent = fs.readFileSync(directoryTemplate, 'utf-8');
		let updatedTemplate = templateContent
			.replace('<h1></h1>', '<h1>Moodboards</h1>')
			.replace('<ul></ul>', `<ul>${moodboardList}</ul>`);
	
		// Render the HTML list
		res.send(updatedTemplate);
	});
});

// Middleware to handle requests for /moodboards/:moodboardName
app.get('/moodboards/:moodboardName', (req, res) => {
	const { moodboardName } = req.params;
	const moodboardPath = path.join(moodboardsDirectory, moodboardName);
  
	// Read the template file
	fs.readFile(moodboardsTemplate, 'utf-8', (err, templateContent) => {
		if (err) {
		res.status(500).send('Internal Server Error');
		return;
		}

		// Read the directory to get a list of image files
		fs.readdir(moodboardPath, (err, files) => {
		if (err) {
			res.status(404).send('Moodboard not found');
			return;
		}

		// Create an HTML gallery using the image files
		const imageGallery = files
			.filter(file => file.endsWith('.jpg') || file.endsWith('.png'))
			.map(file => `<img src="/moodboards/${moodboardName}/${file}" alt="${file}">`)
			.join('');

		// Insert the moodboard name and gallery HTML into the template
		const updatedTemplate = templateContent
			.replace('<title id="moodboard-title"></title>', `<title>${moodboardName}</title>`)
			.replace('<h1 id="moodboard-name"></h1>', `<h1>${moodboardName}</h1>`)
			.replace('<div id="image-gallery"></div>', `<div id="image-gallery">${imageGallery}</div>`);

		// Send the updated HTML
		res.send(updatedTemplate);
	  	});
	});
});

app.use(express.static("public"));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
})

app.listen(port, () => {
	console.log(`plica-garden is running at http://localhost:${port}`);
});
