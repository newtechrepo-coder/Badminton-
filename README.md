# 🏸 Minehead Badminton Tournament Website

A responsive badminton tournament management website built with HTML, CSS, JavaScript, and Firebase.

## Features

- **Player Registration**: Players can register for Singles, Doubles, or both categories
- **Admin Dashboard**: Secure login for tournament administrators
- **Fixture Generation**: Automatic knockout tournament bracket creation
- **Responsive Design**: Mobile-first approach for all devices

## Setup Instructions

1. **Create the files**: Save all files in the same directory
2. **Add logo**: Place your `badmintonlogo.png` file in the same directory
3. **Firebase Setup**: The Firebase configuration is already included in `firebase-config.js`
4. **Deploy to GitHub Pages**: 
   - Push all files to a GitHub repository
   - Go to Settings > Pages and select the main branch as your source

## Admin Credentials

Create an admin account in your Firebase Authentication console:
- Go to the Firebase Console
- Select your "Minehead Badminton Tournament" project
- Go to Authentication > Users
- Click "Add user" and create an account with email and password

## Usage

### For Players:
1. Visit the website
2. Fill out the registration form with your name and email
3. Select Singles, Doubles, or both
4. Click "Register"
5. View registered players by category using the tabs
6. Once fixtures are generated, view the tournament brackets

### For Admins:
1. Click "Admin Login" in the top right
2. Enter your Firebase credentials
3. Use the Admin Dashboard to:
   - Open/close registration
   - Remove players
   - Manually pair doubles players
   - Generate and edit fixtures
   - Record match winners

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore)
- **Responsive**: Mobile-first design with media queries
- **Hosting**: GitHub Pages compatible

## File Structure

- `index.html` - Main HTML structure
- `styles.css` - All styling with responsive design
- `firebase-config.js` - Firebase initialization and configuration
- `app.js` - All application logic and functionality
- `badmintonlogo.png` - Tournament logo (you need to add this)
- `README.md` - This documentation file

## License

This project is for educational and personal use only.# Badminton-
