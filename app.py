from flask import Flask, render_template, request, send_from_directory, jsonify
import os
import frontmatter
import markdown
from werkzeug.utils import secure_filename
from PIL import Image

app = Flask(__name__, static_url_path='')
app.config['CONTENT_FOLDER'] = 'content'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Constants
CONTENT_PATH = os.path.join(os.path.dirname(__file__), 'content')
DIRECTORY_TEMPLATE = 'directory.html'
VIEW_TEMPLATE = 'view.html'

IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.m4v', '.webm']

# Serve static files from the 'content' folder
@app.route('/content/<path:filepath>')
def content(filepath):
    full_path = os.path.join(CONTENT_PATH, filepath)
    
    try:
        return send_from_directory(CONTENT_PATH, filepath)
    except FileNotFoundError:
        return f"File not found: {full_path}", 404

def listdir_by_modified(directory_path):
    try:
        files = os.listdir(directory_path)
        sorted_files = sorted(files, key=lambda file: os.path.getmtime(os.path.join(directory_path, file)), reverse=True)
        return sorted_files
    except Exception as e:
        print(f"Error: {e}")
        return None

def get_nav_bar(current_location):
    root = os.listdir(CONTENT_PATH)
    nav_bar = '<nav>\n<ul>'

    if current_location == '/':
        nav_bar += '\n<li><a id="current" href="/">home</a></li>'
    else:
        nav_bar += '\n<li><a href="/">home</a></li>'

    for directory in root:
        location = os.path.join(CONTENT_PATH, directory)
        if directory.startswith('.'):
            continue
        if os.path.isdir(location):
            if location.endswith(current_location):
                nav_bar += f'\n<li><a id="current" href="/{directory}">{directory}</a></li>'
            else:
                nav_bar += f'\n<li><a href="/{directory}">{directory}</a></li>'
    nav_bar += '\n</ul>\n</nav>'
    return nav_bar

@app.route('/')
def home():
    home_page = render_template('index.html', nav=get_nav_bar('/'))
    return home_page

@app.route('/<location>')
def view_directory(location):
    abs_location_path = os.path.join(CONTENT_PATH, location)

    if not os.path.isdir(abs_location_path):
        return 'Location not found.', 404

    # Sort through notes and regular files / folders
    contents = sorted(os.listdir(abs_location_path))
    notes = []
    files = []

    for file in contents:
        if file.startswith('.') or file.startswith('_assets'):
            continue

        if file.endswith('.md'):
            notes.append(file)
            continue

        relative_path = os.path.join(location, file)
        absolute_path = os.path.join(CONTENT_PATH, relative_path)

        if not os.path.isdir(absolute_path):
            files.append({'link': f"/view/{relative_path}", 'text': file})
            continue

        preview_src = ''

        if (len(os.listdir(absolute_path)) > 0):
            first_file = listdir_by_modified(absolute_path)[0]
            preview_rel_path = os.path.join(relative_path, first_file)
            # Get the link only if the file has a valid image extension
            preview_src = os.path.join(app.config['CONTENT_FOLDER'], preview_rel_path) if first_file and any(first_file.endswith(ext) for ext in IMAGE_EXTENSIONS) else None

        files.append({
            'link': f"/view/{relative_path}",
            'figure': {
                'preview_path': preview_src,
                'caption': file.replace("-", " ")
            }
        })

    # Formatted links to notes which have a valid tag and title
    # Tag dictionary should have all tags
    tag_dictionary = {}

    for file in notes:
        relative_path = os.path.join(location, file)
        absolute_path = os.path.join(CONTENT_PATH, relative_path)
        post = frontmatter.load(absolute_path)

        # Really ugly but it works
        tags = post.get('tags', []) if isinstance(post.get('tags'), list) else \
            [tag.strip() for tag in post.get('tags', '').split(',')]

        for tag in tags:
            if tag not in tag_dictionary:
                tag_dictionary[tag] = []
            tag_dictionary[tag].append({'path': relative_path, 'title': post['title']})

    # Each section which should be turned into html with a list of notes
    sections = {}
    for tag, notes in tag_dictionary.items():
        sections[tag] = [{'link': f"/view/{note['path']}", 'text': note['title']} for note in notes]

    return render_template(
        DIRECTORY_TEMPLATE,
        nav=get_nav_bar(location),
        title=location,
        directory_list=files,
        notes=sections
    )

@app.route('/view/<path:location>')
def view_file(location):
    absolute_path = os.path.join(CONTENT_PATH, location)

    # If the page is a directory, create a moodboard with the media files
    if os.path.isdir(absolute_path):
        files = listdir_by_modified(absolute_path)
        media = []

        for index, file in enumerate(files):
            file_path = os.path.join(location, file)

            if any(file.endswith(ext) for ext in IMAGE_EXTENSIONS):
                absolute_path = os.path.join(CONTENT_PATH, file_path)
                src_path = os.path.join(app.config['CONTENT_FOLDER'], file_path)
                dimensions = get_image_size(absolute_path)
                media.append({
                    'index': index,
                    'src': f"/{src_path}",
                    'width': dimensions[0],
                    'height': dimensions[1]
                })

            if any(file.endswith(ext) for ext in VIDEO_EXTENSIONS):
                src_path = os.path.join(app.config['CONTENT_FOLDER'], file_path)
                media.append({
                    'index': index,
                    'src': f"/{src_path}",
                    'title': file
                })

        return render_template(
            VIEW_TEMPLATE,
            nav=get_nav_bar(location.split("/")[0]),
            title=location,
            media_list=media,
            moodboard=True
        )
    # If it's a note, show the note
    elif os.path.isfile(absolute_path):
        note = frontmatter.load(absolute_path)
        # regex to make markdown links work
        # should turn [text](link/to/note) into [text](/view/link/to/note.md)
        # which will get turn into proper html
        replaced_content = note.content.replace(r'\[([^\]]+)\]\((/[^\)]+)\)', r'[\1](/view\2.md)')
        html_content = markdown.markdown(replaced_content)
        title = note.get('title', location)

        return render_template(
            VIEW_TEMPLATE,
            nav=get_nav_bar(location.split("/")[0]),
            title=title,
            content=html_content
        )

def get_image_size(image_path):
    try:
        with Image.open(image_path) as img:
            width, height = img.size
            return width, height
    except Exception as e:
        print(f"Error while getting image size: {e}")
        return None

@app.route('/upload/<path:location>', methods=['POST'])
def upload_file(location):
    destination_path = os.path.join(CONTENT_PATH, location)
    os.makedirs(destination_path, exist_ok=True)
    file = request.files['file']
    if file:
        filename = secure_filename(file.filename)
        file.save(os.path.join(destination_path, filename))
        return jsonify({'message': 'File uploaded successfully'}), 200
    else:
        return jsonify({'message': 'No file provided'}), 400

@app.route('/delete/<path:location>', methods=['DELETE'])
def delete_file(location):
    try:
        file_path = os.path.join(CONTENT_PATH, location)
        os.remove(file_path)
        return 'File deleted successfully', 200
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(port=3333, debug=True)
