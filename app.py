from flask import Flask, render_template, request, send_from_directory, jsonify
import os
import shutil
import frontmatter
import markdown
from flask_wtf.csrf import CSRFProtect
from werkzeug.utils import secure_filename
from PIL import Image

app = Flask(__name__, static_url_path='')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['CONTENT_FOLDER'] = 'content'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

csrf = CSRFProtect(app)

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
    location_path = os.path.join(CONTENT_PATH, location)

    if not os.path.isdir(location_path):
        return 'Location not found.', 404

    contents = sorted(os.listdir(location_path))
    notes_files = []
    files_list = []

    for file in contents:
        file_path = os.path.join(location, file)
        absolute_path = os.path.join(CONTENT_PATH, file_path)

        if file.endswith('.md'):
            notes_files.append(file)
            continue

        if file.startswith('.') or file.startswith('_assets'):
            continue

        if os.path.isdir(absolute_path):
            if (len(os.listdir(absolute_path)) < 1): continue
            first_file = listdir_by_modified(absolute_path)[0]
            preview_image_path = os.path.join(file_path, first_file)

            files_list.append({
                'link': f"/view/{file_path}",
                'figure': {
                    'preview_path': os.path.join(app.config['CONTENT_FOLDER'], preview_image_path) if first_file and any(first_file.endswith(ext) for ext in IMAGE_EXTENSIONS) else None,
                    'caption': file.replace("-", " ")
                }
            })
        else:
            files_list.append({'link': f"/view/{file_path}", 'text': file})

    tag_sections = {}

    for file in notes_files:
        file_path = os.path.join(location_path, file)
        if os.path.isdir(file_path):
            continue

        note = frontmatter.load(file_path)

        tags = note.get('tags', []) if isinstance(note.get('tags'), list) else \
            [tag.strip() for tag in note.get('tags', '').split(',')]

        for tag in tags:
            if tag not in tag_sections:
                tag_sections[tag] = []
            tag_sections[tag].append({'file': file, 'title': note.get('title', '')})

    sections = {}
    for tag, notes in tag_sections.items():
        sections[tag] = [{'link': f"/view/{location}/{note['file']}", 'text': note['title']} for note in notes]

    return render_template(
        DIRECTORY_TEMPLATE,
        nav=get_nav_bar(location),
        title=location,
        directory_list=files_list,
        notes=sections
    )

@app.route('/view/<path:location>')
def view_file(location):
    full_path = os.path.join(CONTENT_PATH, location)

    if os.path.isdir(full_path):
        files = listdir_by_modified(full_path)
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
            'view.html',
            nav=get_nav_bar(location.split("/")[0]),
            title=location if media else 'File Not Found',
            media_list=media
        )
    elif os.path.isfile(full_path):
        post = frontmatter.load(full_path)
        replaced_content = post.content.replace(r'\[([^\]]+)\]\((/[^\)]+)\)', r'[\1](/view\2.md)')
        html_content = markdown.markdown(replaced_content)
        title = post.get('title', location)

        return render_template(
            'view.html',
            nav=get_nav_bar(location.split("/")[0]),
            title=title,
            content=html_content
        )
    else:
        os.abort()  # File not found

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
    try:
        url_parts = request.url.replace('/upload', '/content').split('/').filter(None)
        destination_path = os.path.join(os.path.dirname(__file__), *url_parts)
        os.makedirs(destination_path, exist_ok=True)
        file = request.files['file']
        if file:
            filename = secure_filename(file.filename)
            file.save(os.path.join(destination_path, filename))
            return jsonify({'message': 'File uploaded successfully'}), 200
        else:
            return jsonify({'message': 'No file provided'}), 400
    except Exception as e:
        return str(e), 500

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
