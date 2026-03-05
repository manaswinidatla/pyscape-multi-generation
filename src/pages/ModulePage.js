// src/pages/ModulePage.js
import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

const moduleData = {
  1: {
    title: "Python Fundamentals",
    lessons: [
      {
        id: 1,
        title: "Introduction to Python",
        description: "Get started with Python basics.",
        levels: [
          { id: 1, title: "Welcome!" },
          { id: 2, title: "Print" },
          { id: 3, title: "Using Print()" },
          { id: 4, title: "Comment Lines" },

        ],
      },
      {
        id: 2,
        title: "Variables and Data Types",
        description: "Learn how to store and use values in Python.",
        levels: [
          { id: 1, title: "Declaring Variables" },
          { id: 2, title: "Data Type Basics" },
          { id: 3, title: "Casting in python" },
        ],
      },
      {
        id: 3,
        title: "Control Flow",
        description: "Understand loops and conditional logic.",
        levels: [
          { id: 1, title: "If-Else Statements" },
          { id: 2, title: "Loops" },
        ],
      },
      {
  id: 4,
  title: "Playing with Strings",
  description: "Getting started with strings and essential string operations in Python.",
  levels: [
    { id: 1, title: "Introduction to Strings" },
    { id: 2, title: "String Slicing" },
    { id: 3, title: "String Modification & Concatenation" },
    { id: 4, title: "String Formatting" },
    { id: 5, title: "Common String Methods" },
  ],
},

      
    ],
  },
  2: {
    title: "Data Science with Pandas",
    lessons: [
      {
        id: 1,
        title: "Getting Started with Pandas",
        description: "Introduction to data manipulation with Pandas.",
        levels: [
          { id: 1, title: "Series" },
          { id: 2, title: "DataFrame" },
        ],
      },
    ],
  },
};

const ModulePage = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const module = moduleData[moduleId];

  // Track which lessons are expanded
  const [expandedLessons, setExpandedLessons] = useState({});

  const toggleLesson = (lessonId) => {
    setExpandedLessons((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  if (!module) return <h2 className="text-center text-red-500">Module not found</h2>;

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        ← Back
      </button>
      <h1 className="text-3xl font-bold mb-6 text-white">{module.title}</h1>
      <h3 className="text-xl font-semibold mb-4 text-gray-300">Lessons</h3>

      <div className="flex flex-col gap-6">
        {module.lessons.map((lesson) => (
          <div
            key={lesson.id}
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-md transition-all"
          >
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-lg font-semibold text-white mb-1">
                  {lesson.title}
                </h4>
                <p className="text-gray-400 text-sm">{lesson.description}</p>
              </div>

              <button
                onClick={() => toggleLesson(lesson.id)}
                className="text-blue-400 text-sm font-medium hover:underline focus:outline-none"
              >
                {expandedLessons[lesson.id] ? "Hide Levels ▲" : "View Levels ▼"}
              </button>
            </div>

            {/* Collapsible Levels Section */}
            {expandedLessons[lesson.id] && (
              <div className="flex flex-col gap-2 mt-4 animate-fadeIn">
                {lesson.levels.map((level) => (
                  <Link
                    key={level.id}
                    to={`/learn/${moduleId}/lesson/${lesson.id}/level/${level.id}`}
                    className="bg-gray-700 hover:bg-gray-600 text-sm text-blue-300 font-medium py-2 px-4 rounded-md transition transform hover:scale-[1.02]"
                  >
                    {level.title} →
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModulePage;
