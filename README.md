# Indoor Navigation Web Application

A web-based indoor navigation system using Augmented Reality (AR) technology. This application allows users to create, save, and navigate through indoor maps using AR markers and waypoints.

## Features

- AR-based indoor navigation
- Interactive map creation
- Waypoint placement and management
- Real-time path finding using A* algorithm
- Mobile-friendly interface
- Persistent map storage

## Technologies Used

- A-Frame for 3D/AR scene management
- AR.js for augmented reality features
- Express.js for server
- HTML5/CSS3 for structure and styling
- JavaScript (ES6+) for application logic

## Prerequisites

- Node.js >= 14.0.0
- Modern web browser with WebXR support
- Camera access for AR features
- HTTPS connection (required for AR features)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd indoor-nav-web
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Deployment on Choreo

This application is configured for deployment on WSO2 Choreo:

1. Connect your GitHub repository to Choreo
2. Create a new Web Application component
3. Configure the build settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Deploy the application

## Usage

1. **Creating a Map**
   - Click "Create Map"
   - Allow camera access
   - Tap to place waypoints
   - Click "Save Map" when finished

2. **Loading a Map**
   - Click "Load Map"
   - Select a previously created map
   - The map will load with all waypoints

3. **Navigating**
   - Click "Start Navigation"
   - Select a destination waypoint
   - Follow the AR path indicators

## Project Structure

```
indoor-nav-web/
├── index.html          # Main application entry point
├── css/
│   └── styles.css      # Application styling
├── js/
│   ├── astar.js        # A* pathfinding algorithm
│   ├── mapManager.js   # Map creation and management
│   └── navigation.js   # Navigation controller
├── server.js           # Express server configuration
└── package.json        # Project dependencies and scripts
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
