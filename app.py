from flask import Flask, render_template, request, send_from_directory, jsonify, send_file
from moviepy.editor import VideoFileClip
import imageio
import os
import frontmatter
import markdown
from werkzeug.utils import secure_filename
from PIL import Image
import tempfile
import shutil
import atexit

app = Flask(__name__, static_url_path='')
app.config['CONTENT_FOLDER'] = 'content'
app.config['THUMBNAIL_FOLDER'] = 'thumbs'
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

def listdir_by_modified(path):
    try:
        return sorted(os.listdir(path), key=lambda file: os.path.getmtime(os.path.join(path, file)), reverse=True)
    except Exception as e:
        print(f"Error: {e}")
        return None
    
def listdir_by_alpha(path):
    try:
        return sorted(os.listdir(path), key=lambda file: file.lower())
    except Exception as e:
        print(f"Error: {e}")
        return None

def get_nav_bar(current_location):
    root = os.listdir(CONTENT_PATH)
    nav_bar = '\n<nav>\n<ul>'

    if current_location == '/':
        nav_bar += '\n<li><a id="current" href="/">home</a></li>'
    else:
        nav_bar += '\n<li><a href="/">home</a></li>'

    for directory in root:
        location = os.path.join(CONTENT_PATH, directory)
        if os.path.isdir(location):
            # Start hidden if the directory start with '.'
            nav_bar += '\n<li class="hidden-dir hidden">' if directory.startswith('.') else '\n<li>'
            if location.endswith(current_location):
                nav_bar += f'\n<a id="current" href="/{directory}">{directory}</a>'
            else:
                nav_bar += f'\n<a href="/{directory}">{directory}</a>'
            nav_bar += '\n</li>'
    nav_bar += '\n</ul>'
    nav_bar += '\n</nav>'
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

        relative_file_path = os.path.join(location, file)
        absolute_file_path = os.path.join(CONTENT_PATH, relative_file_path)

        if not os.path.isdir(absolute_file_path):
            files.append({'link': f"/view/{relative_file_path}", 'text': file})
            continue

        preview_src = get_preview_image(relative_file_path)

        files.append({
            'link': f"/view/{relative_file_path}",
            'figure': {
                'preview_path': preview_src,
                'caption': file.replace("-", " ")
            }
        })

    # Formatted links to notes which have a valid tag and title
    # Tag dictionary should have all tags
    tag_dictionary = {}

    for file in notes:
        relative_file_path = os.path.join(location, file)
        absolute_file_path = os.path.join(CONTENT_PATH, relative_file_path)
        post = frontmatter.load(absolute_file_path)

        # Really ugly but it works
        tags = post.get('tags', []) if isinstance(post.get('tags'), list) else \
            [tag.strip() for tag in post.get('tags', '').split(',')]

        for tag in tags:
            if tag not in tag_dictionary:
                tag_dictionary[tag] = []
            tag_dictionary[tag].append({'path': relative_file_path, 'post': post})

    return render_template(
        DIRECTORY_TEMPLATE,
        nav=get_nav_bar(location),
        title=location,
        directory_list=files,
        notes=tag_dictionary
    )

def get_preview_image(location):
    full_path = os.path.join(CONTENT_PATH, location)
    if (not len(os.listdir(full_path)) > 0): return None
    files = listdir_by_modified(full_path)

    for file in files:
        _, file_extension = os.path.splitext(file)
        if file_extension.lower() in IMAGE_EXTENSIONS:
            return os.path.join(app.config['CONTENT_FOLDER'], location, file)
        if file_extension.lower() in VIDEO_EXTENSIONS:
            return os.path.join(app.config['THUMBNAIL_FOLDER'], location, file)

    return None

# Pages with a lot of videos seem to be really slow, not exactly sure why...
# Needs some investigating
@app.route('/view/<path:location>')
def view_file(location):
    absolute_path = os.path.join(CONTENT_PATH, location)

    # If the page is a directory, create a moodboard with the media files
    if os.path.isdir(absolute_path):
        parent_directory = os.path.join(CONTENT_PATH, os.path.dirname(location))
        adjacent_directories = [directory.replace('-', ' ') for directory in listdir_by_alpha(parent_directory) if os.path.isdir(os.path.join(parent_directory, directory))]
        pretty_title = os.path.basename(location).replace('-', ' ')
        files = listdir_by_modified(absolute_path)
        media = []

        for index, file in enumerate(files):
            if file.startswith('.'): continue
            file_path = os.path.join(location, file)
            absolute_path = os.path.join(CONTENT_PATH, file_path)

            if any(file.endswith(ext) for ext in IMAGE_EXTENSIONS):
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
                dimensions = get_video_size(absolute_path)
                media.append({
                    'title': file,
                    'index': index,
                    'src': f"/{src_path}",
                    'thumbnail': f"/thumbs/{file_path}",
                    'width': dimensions[0] if dimensions != None else 640,
                    'height': dimensions[1]  if dimensions != None else 360
                })

        return render_template(
            VIEW_TEMPLATE,
            nav=get_nav_bar(location.split("/")[0]),
            title=pretty_title,
            media_list=media,
            moodboard=True,
            sibling_boards=adjacent_directories
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
    
def get_video_size(video_path):
    try:
        with imageio.get_reader(video_path) as reader:
            metadata = reader.get_meta_data()
            width, height = metadata['size']
        return width, height
    except Exception as e:
        print(e)
        return None

# Path for video thumbnails... kind of a really dumb solution but preload="metadata" doesn't work
temp_dir = tempfile.mkdtemp()

# Register cleanup function to delete the temporary directory on application exit
# atexit.register(shutil.rmtree, temp_dir, ignore_errors=True)    

# This is SLOW AS BALLS!!! it works doe
@app.route('/thumbs/<path:video_path>')
def generate_thumbnail(video_path):
    absolute_video_path = os.path.join(CONTENT_PATH, video_path)
    video_file_name = os.path.splitext(os.path.basename(video_path))[0]
    temp_thumbnail_path = os.path.join(temp_dir, f'{video_file_name}_thumb.jpg')

    if os.path.exists(temp_thumbnail_path):
        return send_file(temp_thumbnail_path, mimetype='image/jpeg', as_attachment=True, download_name=f'{video_file_name}_thumbnail.jpg')

    try:
        clip = VideoFileClip(absolute_video_path)

        # Generate the thumbnail
        halfway_time = clip.duration / 2
        clip.save_frame(temp_thumbnail_path, halfway_time)
        clip.close()

        return send_file(temp_thumbnail_path, mimetype='image/jpeg', as_attachment=True, download_name=f'{video_file_name}_thumb.jpg')

    except Exception as e:
        return str(e)

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
