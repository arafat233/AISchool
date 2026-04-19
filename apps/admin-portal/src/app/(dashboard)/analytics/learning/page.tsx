"use client";
import { useEffect, useState } from "react";

interface LessonDropoff {
  lesson_title: string;
  started: number;
  completed: number;
  avg_time_min: number;
  completion_pct: number;
}

interface CourseProgress {
  course_name: string;
  class_name: string;
  avg_progress_pct: number;
  completed_students: number;
  total_students: number;
  total_time_hours: number;
}

const MOCK_COURSES: CourseProgress[] = [
  { course_name: "Mathematics — Algebra", class_name: "Grade 9-A", avg_progress_pct: 72, completed_students: 18, total_students: 38, total_time_hours: 142 },
  { course_name: "Science — Periodic Table", class_name: "Grade 9-A", avg_progress_pct: 85, completed_students: 28, total_students: 38, total_time_hours: 98 },
  { course_name: "English — Poetry", class_name: "Grade 10-B", avg_progress_pct: 41, completed_students: 8, total_students: 35, total_time_hours: 67 },
  { course_name: "History — World War II", class_name: "Grade 10-A", avg_progress_pct: 93, completed_students: 34, total_students: 36, total_time_hours: 180 },
];

const MOCK_LESSONS: LessonDropoff[] = [
  { lesson_title: "Introduction to Algebra", started: 38, completed: 37, avg_time_min: 22, completion_pct: 97 },
  { lesson_title: "Linear Equations", started: 36, completed: 30, avg_time_min: 35, completion_pct: 83 },
  { lesson_title: "Quadratic Equations", started: 32, completed: 21, avg_time_min: 48, completion_pct: 66 },
  { lesson_title: "Polynomials", started: 25, completed: 14, avg_time_min: 52, completion_pct: 56 },
  { lesson_title: "Coordinate Geometry", started: 18, completed: 9, avg_time_min: 41, completion_pct: 50 },
];

export default function LearningAnalyticsPage() {
  const [courses, setCourses] = useState<CourseProgress[]>(MOCK_COURSES);
  const [lessons, setLessons] = useState<LessonDropoff[]>(MOCK_LESSONS);
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Student Learning Analytics</h1>

      {/* Course Heatmap */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b font-semibold text-gray-800">Course Completion Heatmap</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Course</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-right">Avg Progress</th>
              <th className="px-4 py-3 text-right">Completed</th>
              <th className="px-4 py-3 text-right">Total Time</th>
              <th className="px-4 py-3 w-32">Progress Bar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses.map((c, i) => {
              const color = c.avg_progress_pct >= 80 ? "bg-green-500" : c.avg_progress_pct >= 50 ? "bg-blue-500" : "bg-orange-400";
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.course_name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.class_name}</td>
                  <td className="px-4 py-3 text-right font-semibold">{c.avg_progress_pct}%</td>
                  <td className="px-4 py-3 text-right">{c.completed_students}/{c.total_students}</td>
                  <td className="px-4 py-3 text-right">{c.total_time_hours}h</td>
                  <td className="px-4 py-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${c.avg_progress_pct}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Lesson Drop-off Funnel */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b font-semibold text-gray-800">Lesson-Level Drop-off (Mathematics — Algebra, Grade 9-A)</div>
        <div className="p-6 space-y-3">
          {lessons.map((l, i) => {
            const dropPct = 100 - l.completion_pct;
            const width = Math.max(l.completion_pct, 10);
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-5 text-right">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{l.lesson_title}</span>
                    <span className="text-xs text-gray-500">{l.avg_time_min} min avg</span>
                  </div>
                  <div className="h-6 bg-gray-100 rounded-lg overflow-hidden flex">
                    <div
                      className="h-full bg-blue-500 rounded-l-lg flex items-center justify-center text-white text-xs"
                      style={{ width: `${width}%` }}
                    >
                      {l.completed}/{l.started}
                    </div>
                  </div>
                </div>
                {dropPct > 25 && (
                  <span className="text-xs text-orange-600 flex-shrink-0">▼ {dropPct}% drop</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Data sourced from LMS lesson progress records. Students who watched &gt;80% of a video or scrolled to end of PDF are counted as completed.
      </p>
    </div>
  );
}
