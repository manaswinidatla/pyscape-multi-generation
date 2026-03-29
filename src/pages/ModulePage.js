// src/pages/ModulePage.js
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import supabase from "../utils/supabaseClient";
import { useAuth } from "../context/AuthContext";

const ModulePage = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [module, setModule] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLessons, setExpandedLessons] = useState({});

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        // Convert moduleId to integer for database queries
        const modId = parseInt(moduleId);
        console.log(`📚 Fetching module: ${modId}`);

        // Fetch module
        const { data: mod, error: modErr } = await supabase
          .from('modules')
          .select('id, title, description, difficulty')
          .eq('id', modId)
          .single();

        console.log(`Module query result:`, { mod, modErr });
        if (modErr) {
          console.error(`❌ Module fetch error:`, modErr);
          throw modErr;
        }

        // Fetch lessons with parts (sublevels) from database
        const { data: lessonData, error: lessonErr } = await supabase
          .from('lessons')
          .select('id, skill_id, title, type, order_index, estimated_minutes, parts')
          .eq('module_id', modId)
          .order('order_index', { ascending: true });

        console.log(`Lessons query result:`, { lessonCount: lessonData?.length, lessonErr });
        if (lessonErr) {
          console.error(`❌ Lessons fetch error:`, lessonErr);
          throw lessonErr;
        }

        // Fetch lesson completion state for the signed-in user
        let progressMap = {};
        if (user?.id && lessonData?.length) {
          const lessonIds = lessonData.map(l => l.id);
          const { data: progressRows, error: progressErr } = await supabase
            .from('progress')
            .select('lesson_id, state')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds);

          if (progressErr) {
            console.error('⚠️ Progress fetch error:', progressErr);
          } else {
            progressMap = (progressRows || []).reduce((acc, row) => {
              acc[row.lesson_id] = row.state;
              return acc;
            }, {});
          }
        }

        // Transform lessons: convert parts array to levels with proper IDs
        const enrichedLessons = (lessonData || []).map(lesson => {
          let levels = [];
          
          // If lesson has parts from database, use them
          if (lesson.parts && Array.isArray(lesson.parts) && lesson.parts.length > 0) {
            // Filter out null/undefined parts and map to levels
            levels = lesson.parts
              .filter(part => part != null) // Skip null/undefined elements
              .map((part, index) => ({
                id: part.level || (index + 1),
                level: part.level || (index + 1),
                title: part.title || `Level ${index + 1}`,
                description: part.description || ''
              }));
            console.log(`✅ Loaded ${levels.length} parts for lesson "${lesson.title}" from database`);
          } else {
            // Fallback: create a single level with lesson title if no parts exist
            levels = [{ 
              id: 1,
              level: 1,
              title: lesson.title, 
              description: 'Content coming soon' 
            }];
            console.warn(`⚠️ No parts found for lesson "${lesson.title}" - showing placeholder`);
          }

          return {
            ...lesson,
            description: lesson.type === 'read' ? 'Read through the content' : 'Practice with code',
            levels: levels,
            progressState: progressMap[lesson.id] || 'not_started',
            isCompleted: progressMap[lesson.id] === 'completed'
          };
        });

        setModule(mod);
        setLessons(enrichedLessons);
      } catch (err) {
        console.error('❌ Error fetching module:', err.message || err);
        console.error('Full error:', err);
        setModule(null);
        setLessons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModuleData();
  }, [moduleId, user]);

  const toggleLesson = (lessonId) => {
    setExpandedLessons((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-4 w-16 bg-dark-lighter rounded animate-pulse mb-6" />
        <div className="h-8 w-64 bg-dark-lighter rounded animate-pulse mb-6" />
        <div className="flex flex-col gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-6 animate-pulse">
              <div className="h-5 w-48 bg-gray-700 rounded mb-2" />
              <div className="h-4 w-64 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
        {lessons.map((lesson) => (
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
                <div className="mt-2">
                  {lesson.isCompleted ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                      ✓ Completed
                    </span>
                  ) : lesson.progressState === 'in_progress' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-900/40 text-blue-300 border border-blue-700/40">
                      In Progress
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-700/50 text-gray-300 border border-gray-600/40">
                      Not Started
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => toggleLesson(lesson.id)}
                className="text-blue-400 text-sm font-medium hover:underline focus:outline-none"
              >
                {expandedLessons[lesson.id]
                  ? "Hide Levels ▲"
                  : lesson.isCompleted
                    ? "Review Levels ▼"
                    : "View Levels ▼"}
              </button>
            </div>

            {/* Collapsible Levels Section */}
            {expandedLessons[lesson.id] && (
              <div className="flex flex-col gap-2 mt-4 animate-fadeIn">
                {lesson.levels.map((level) => (
                  <Link
                    key={level.id}
                    to={`/learn/${moduleId}/lesson/${lesson.id}/level/${level.id}`}
                    className={`text-sm font-medium py-2 px-4 rounded-md transition transform hover:scale-[1.02] ${
                      lesson.isCompleted
                        ? 'bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-200'
                        : 'bg-gray-700 hover:bg-gray-600 text-blue-300'
                    }`}
                  >
                    {lesson.isCompleted ? '✓ ' : ''}Level {level.level}: {level.title} →
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
