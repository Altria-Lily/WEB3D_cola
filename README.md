# CakeCola 3D Product Showcase

An interactive 3D beverage product showcase website using Three.js and Django.

## Project Introduction

CakeCola 3D Product Showcase is an interactive product display website developed using modern web technologies. The project uses Three.js to implement 3D model loading and rendering, while integrating Django backend to handle user form submissions and data management. Main features:

- 3D model display of three products
- Model interaction functions (rotation, scaling, opening bottle caps, flattening, etc.)
- Lighting and material controls
- Special effects applications (glow, cartoon effects, etc.)
- Contact form submission and management

## Technology Stack

### Frontend

- HTML5 & CSS3
- JavaScript (ES6+)
- Three.js - 3D model rendering and interaction
- TailwindCSS - Styling framework
- GSAP - Animation effects
- Custom Shaders - Custom GLSL shaders

### Backend

- Django - Web framework
- SQLite - Data storage
- Django Admin - Backend management

## Feature Highlights

- **3D Model Interaction**: 360-degree full view of product models
- **Multiple Material Switching**: Including default materials, wireframes, highlights, and matte finishes
- **Lighting Control**: Users can adjust ambient light, main light source intensity and color
- **Preset Camera Angles**: Convenient viewing from different angles
- **Post-processing Effects**: Various effects including glow, cartoon, and perspective
- **Responsive Design**: Adapts to different device screens
- **Form Submission**: Users can submit purchase requests, data stored in backend database

## Running the Project

### Frontend Development

```bash
cd front
npm install
npm run dev
```

### Backend Service

```bash
cd end
python manage.py runserver
```

### Admin Access

Visit http://localhost:8000/admin/ Login with superuser credentials (admin/password)

## Project Structure

```
CakeCola-Three.js/
├── front/                # Frontend project
│   ├── public/           # Static resources
│   │   ├── model/        # 3D model files
│   │   ├── images/       # Image resources
│   │   └── sound/        # Audio resources
│   ├── src/              # Source code
│   │   ├── main.js       # Main JavaScript code
│   │   └── index.css     # Stylesheet
│   └── index.html        # Main HTML file
└── end/                  # Backend project
    ├── cakecola/         # Django project settings
    ├── contacts/         # Contacts application
    │   ├── models.py     # Data models
    │   ├── views.py      # View functions
    │   └── admin.py      # Admin interface settings
    └── manage.py         # Django management script
```

## About Contributions

The project welcomes contributions and suggestions. Please fork this repository, create a branch, submit changes, and then initiate a pull request.

## License

MIT License

## Contact Information

For any questions or suggestions, please contact contact@cakecola.com