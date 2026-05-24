// app.js

// Import required modules
const express = require('express');
const fs = require('fs');
const path = require('path');

// Create an Express app
const app = express();

// Server will run on port 5000
const PORT = 5000;

// Allow cross-origin requests from local frontend tools like VS Code Live Server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Middleware to parse JSON request bodies
app.use(express.json());

// Path to the JSON file where course data will be stored
const filePath = path.join(__dirname, 'courses.json');

// Allowed status values for a course
const validStatuses = ['Not Started', 'In Progress', 'Completed'];

/*
  Helper function:
  Make sure courses.json exists when the server starts.
  If it does not exist, create it with an empty array [].
*/
function initializeFile() {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]', 'utf8');
      console.log('courses.json created successfully.');
    }
  } catch (error) {
    console.error('Error initializing courses.json:', error.message);
  }
}

/*
  Helper function:
  Read all courses from courses.json
  Returns an array of course objects
*/
function readCourses() {
  try {
    const data = fs.readFileSync(filePath, 'utf8');

    // If file is empty, return empty array
    if (!data.trim()) {
      return [];
    }

    return JSON.parse(data);
  } catch (error) {
    throw new Error('Error reading courses file.');
  }
}

/*
  Helper function:
  Write the updated courses array back to courses.json
*/
function writeCourses(courses) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(courses, null, 2), 'utf8');
  } catch (error) {
    throw new Error('Error writing to courses file.');
  }
}

/*
  Helper function:
  Validate date format YYYY-MM-DD
*/
function isValidDateFormat(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateString);
}

/*
  Helper function:
  Generate the next course ID
  Starts from 1
*/
function generateNextId(courses) {
  if (courses.length === 0) {
    return 1;
  }

  // Find the highest existing ID and add 1
  const maxId = Math.max(...courses.map(course => course.id));
  return maxId + 1;
}

/*
  ROOT ROUTE
  Simple welcome message
*/
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to CodeCraftHub API'
  });
});

/*
  POST /api/courses
  Add a new course
*/
app.post('/api/courses', (req, res) => {
  try {
    const { name, description, target_date, status } = req.body;

    // Check for missing required fields
    if (!name || !description || !target_date || !status) {
      return res.status(400).json({
        error: 'Missing required fields. Please provide name, description, target_date, and status.'
      });
    }

    // Validate date format
    if (!isValidDateFormat(target_date)) {
      return res.status(400).json({
        error: 'target_date must be in YYYY-MM-DD format.'
      });
    }

    // Validate status value
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status value. Allowed values are: Not Started, In Progress, Completed.'
      });
    }

    // Read existing courses from file
    const courses = readCourses();

    // Create a new course object
    const newCourse = {
      id: generateNextId(courses),
      name,
      description,
      target_date,
      status,
      created_at: new Date().toISOString()
    };

    // Add new course to array
    courses.push(newCourse);

    // Save updated courses array
    writeCourses(courses);

    // Return success response
    res.status(201).json({
      message: 'Course added successfully.',
      course: newCourse
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Internal server error while adding course.'
    });
  }
});

/*
  GET /api/courses
  Get all courses
*/
app.get('/api/courses', (req, res) => {
  try {
    const courses = readCourses();

    res.status(200).json({
      message: 'Courses retrieved successfully.',
      courses
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Internal server error while fetching courses.'
    });
  }
});

/*
  GET /api/courses/:id
  Get a specific course by ID
*/
app.get('/api/courses/:id', (req, res) => {
  try {
    const courseId = parseInt(req.params.id);

    const courses = readCourses();

    // Find the course by ID
    const course = courses.find(c => c.id === courseId);

    if (!course) {
      return res.status(404).json({
        error: 'Course not found.'
      });
    }

    res.status(200).json({
      message: 'Course retrieved successfully.',
      course
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Internal server error while fetching course.'
    });
  }
});

/*
  PUT /api/courses/:id
  Update a course by ID
  This replaces the editable fields of the course
*/
app.put('/api/courses/:id', (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const { name, description, target_date, status } = req.body;

    // Check for missing required fields
    if (!name || !description || !target_date || !status) {
      return res.status(400).json({
        error: 'Missing required fields. Please provide name, description, target_date, and status.'
      });
    }

    // Validate date format
    if (!isValidDateFormat(target_date)) {
      return res.status(400).json({
        error: 'target_date must be in YYYY-MM-DD format.'
      });
    }

    // Validate status value
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status value. Allowed values are: Not Started, In Progress, Completed.'
      });
    }

    const courses = readCourses();

    // Find course index
    const courseIndex = courses.findIndex(c => c.id === courseId);

    if (courseIndex === -1) {
      return res.status(404).json({
        error: 'Course not found.'
      });
    }

    // Keep original id and created_at
    courses[courseIndex] = {
      id: courses[courseIndex].id,
      name,
      description,
      target_date,
      status,
      created_at: courses[courseIndex].created_at
    };

    writeCourses(courses);

    res.status(200).json({
      message: 'Course updated successfully.',
      course: courses[courseIndex]
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Internal server error while updating course.'
    });
  }
});

/*
  DELETE /api/courses/:id
  Delete a course by ID
*/
app.delete('/api/courses/:id', (req, res) => {
  try {
    const courseId = parseInt(req.params.id);

    const courses = readCourses();

    // Find the course to delete
    const course = courses.find(c => c.id === courseId);

    if (!course) {
      return res.status(404).json({
        error: 'Course not found.'
      });
    }

    // Remove the course from the array
    const updatedCourses = courses.filter(c => c.id !== courseId);

    writeCourses(updatedCourses);

    res.status(200).json({
      message: 'Course deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Internal server error while deleting course.'
    });
  }
});

// Initialize the JSON file before starting the server
initializeFile();

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});