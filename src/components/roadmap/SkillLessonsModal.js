import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import roadmapService from '../../services/roadmapService';

/**
 * SkillLessonsModal - Side drawer with Vertical Step Tracker
 * Slides in from the right when a roadmap node is clicked
 */
export default function SkillLessonsModal({ skill, userId, onClose, cachedLessons }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!cachedLessons);
  const [lessonData, setLessonData] = useState(cachedLessons || null);
  const [lockedToast, setLockedToast] = useState(false);

  useEffect(() => {
    const loadLessons = async () => {
      if (cachedLessons) {
        setLessonData(cachedLessons);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await roadmapService.getLessonsForSkill(skill.id, userId);
        setLessonData(data);
      } catch (error) {
        console.error('Failed to load lessons:', error);
      } finally {
        setLoading(false);
      }
    };

    if (skill) loadLessons();
  }, [skill, userId, cachedLessons]);

  const handleLessonClick = (lesson) => {
    if (lesson.status === 'locked') {
      setLockedToast(true);
      setTimeout(() => setLockedToast(false), 2500);
      return;
    }
    if (lesson.isProject && lesson.projectId) {
      navigate(`/app/projects`);
      onClose();
    } else if (lesson.moduleId && lesson.id) {
      navigate(`/app/learn/${lesson.moduleId}/lesson/${lesson.id}`);
      onClose();
    } else {
      console.warn('Lesson missing moduleId or id:', lesson);
    }
  };

  const handleContinue = () => {
    if (!lessonData?.lessons?.length) return;
    const next =
      lessonData.lessons.find((l) => l.status === 'in_progress') ||
      lessonData.lessons.find((l) => l.status === 'eligible') ||
      lessonData.lessons[0];
    handleLessonClick(next);
  };

  const getBarColor = (status) => {
    if (status === 'completed') return 'bg-green-400';
    if (status === 'in_progress') return 'bg-yellow-400';
    if (status === 'eligible') return 'bg-blue-400';
    return 'bg-gray-600';
  };

  const getRowStyle = (status) => {
    if (status === 'locked') return 'opacity-40 cursor-not-allowed';
    if (status === 'in_progress') return 'bg-yellow-500/10 border border-yellow-500/30 cursor-pointer hover:bg-yellow-500/20';
    if (status === 'completed') return 'bg-green-500/10 border border-green-500/20 cursor-pointer hover:bg-green-500/20';
    if (status === 'eligible') return 'bg-blue-500/10 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20';
    return 'cursor-pointer hover:bg-white/5';
  };

  const getStatusLabel = (lesson) => {
    if (lesson.isProject) return { text: 'Project', color: 'text-purple-400 bg-purple-500/20' };
    if (lesson.status === 'completed') return { text: '✓ Done', color: 'text-green-400 bg-green-500/20' };
    if (lesson.status === 'in_progress') return { text: '▶ Continue', color: 'text-yellow-400 bg-yellow-500/20' };
    if (lesson.status === 'eligible') return { text: 'Start', color: 'text-blue-400 bg-blue-500/20' };
    return { text: '🔒 Locked', color: 'text-gray-500 bg-gray-700/40' };
  };

  const completedCount = lessonData?.completedLessons ?? 0;
  const totalCount = lessonData?.totalLessons ?? 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />

      {/* Side Drawer */}
      <motion.div
        key="drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0f1117] z-50 flex flex-col shadow-2xl border-l border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                {skill.icon || '📘'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">{skill.name}</h2>
                <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{skill.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white text-2xl leading-none ml-3 flex-shrink-0 transition-colors"
            >
              ×
            </button>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
            <span>{'⭐'.repeat(skill.difficulty || 1)}</span>
            <span>•</span>
            <span>
              {Math.floor((skill.estimatedMinutes || 0) / 60)}h {(skill.estimatedMinutes || 0) % 60}m
            </span>
            <span>•</span>
            <span>{totalCount} lessons</span>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">{completedCount} of {totalCount} completed</span>
              <span className="text-primary font-semibold">{progressPct}%</span>
            </div>
            <div className="w-full bg-gray-700/60 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Lesson Step Tracker */}
        <div className="flex-1 overflow-y-auto py-4 px-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary" />
            </div>
          ) : lessonData?.lessons?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-base">No lessons available yet</p>
              <p className="text-sm mt-1 text-gray-500">Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lessonData?.lessons.map((lesson, index) => {
                const { text, color } = getStatusLabel(lesson);
                const barColor = getBarColor(lesson.status);

                return (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => handleLessonClick(lesson)}
                    className={`flex items-center gap-3 rounded-xl p-3 transition-all duration-200 ${getRowStyle(lesson.status)}`}
                  >
                    {/* Status bar */}
                    <div
                      className={`w-1 self-stretch rounded-full flex-shrink-0 ${barColor}`}
                      style={{ minHeight: '2.5rem' }}
                    />

                    {/* Lesson number */}
                    <span className="text-xs font-mono font-bold text-gray-500 w-5 flex-shrink-0 text-right">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    {/* Lesson info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold leading-tight ${lesson.status === 'locked' ? 'text-gray-500' : 'text-white'}`}>
                          {lesson.title}
                        </p>
                        {lesson.isProject && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold">
                            PROJECT
                          </span>
                        )}
                      </div>
                      {lesson.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{lesson.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        {lesson.estimated_minutes && <span>⏱ {lesson.estimated_minutes}m</span>}
                        {lesson.difficulty && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{lesson.difficulty}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${color}`}>
                      {text}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Locked toast */}
        <AnimatePresence>
          {lockedToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mx-4 mb-3 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-xs text-gray-300 text-center flex-shrink-0"
            >
              🔒 Complete earlier lessons to unlock this one
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0f1117] flex gap-3 flex-shrink-0">
          {lessonData?.lessons?.length > 0 && (
            <button
              onClick={handleContinue}
              className="flex-1 py-3 bg-primary hover:bg-primary/80 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              ▶ Continue Learning
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}