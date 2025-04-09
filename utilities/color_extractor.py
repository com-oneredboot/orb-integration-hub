from PIL import Image
from collections import Counter


def get_dominant_colors(image_path, num_colors=5):
    image = Image.open(image_path)
    image = image.resize((150, 150))  # Resize for faster processing
    pixels = list(image.getdata())
    pixel_count = Counter(pixels)
    most_common_colors = pixel_count.most_common(num_colors)
    return [color[0] for color in most_common_colors]


if __name__ == "__main__":
    image_path = 'frontend/src/assets/onredboot-logo.jpg'
    colors = get_dominant_colors(image_path)
    print("Dominant Colors:", colors) 