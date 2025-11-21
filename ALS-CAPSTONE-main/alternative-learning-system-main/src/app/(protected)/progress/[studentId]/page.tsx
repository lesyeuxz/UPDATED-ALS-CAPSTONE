"use client";

// @ts-ignore - available at runtime
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
// @ts-ignore - available at runtime
import { useParams, useRouter } from "next/navigation";
import { useProgressStore } from "@/store/progress-store";
import { useStore } from "@/store";
import { Student, Module, Progress, Activity } from "@/types";
// @ts-ignore - available at runtime
import Image from "next/image";
// @ts-ignore - available at runtime
import { shallow } from "zustand/shallow";

// Import static data directly as fallback
import studentsData from "@/data/students.json";
import progressData from "@/data/progress.json";
import modulesData from "@/data/modules.json";

// Components
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ActivityTable } from "@/components/progress/activity-table";
import { ActivityTableSkeleton } from "@/components/progress/activity-table-skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
// @ts-ignore - available at runtime
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { deleteProgress, fetchModules, fetchProgress, updateProgress, createProgress, fetchStudents as apiFetchStudents } from "@/services/api";
// @ts-ignore - types only in dev
import { set } from "zod";

// Custom hook to safely manage store subscriptions
function useStableStoreData() {
  const [storeData, setStoreData] = useState({
    modules: [] as Module[],
    loadModules: null as any,
    progress: [] as Progress[],
    loadProgress: null as any,
    progressLoading: false,
    students: [] as Student[],
    loadStudents: null as any,
  });

  const [progressStoreData, setProgressStoreData] = useState({
    getStudentByLrn: null as any,
    getFilteredStudents: null as any,
    updateActivity: null as any,
    deleteActivity: null as any,
    fetchStudents: null as any,
    fetchProgress: null as any,
  });

  const isInitialized = useRef(false);

  // Subscribe to main store once
  useEffect(() => {
    const unsubscribe = useStore.subscribe((state) => {
      if (!isInitialized.current) {
        isInitialized.current = true;
      }

      setStoreData({
        modules: state.modules?.data || [],
        loadModules: null, // Remove action access since it's not available in types
        progress: state.progress?.data || [],
        loadProgress: null, // Remove action access since it's not available in types
        progressLoading: state.progress?.loading || false,
        // Add students data from main store
        students: state.students?.data || [],
        loadStudents: null, // Remove action access since it's not available in types
      });
    });

    return unsubscribe;
  }, []);

  // Subscribe to progress store once
  useEffect(() => {
    const unsubscribe = useProgressStore.subscribe((state) => {
      setProgressStoreData({
        getStudentByLrn: state.getStudentByLrn,
        getFilteredStudents: state.getFilteredStudents,
        updateActivity: state.updateActivity,
        deleteActivity: state.deleteActivity,
        fetchStudents: state.fetchStudents,
        fetchProgress: state.fetchProgress,
      });
    });

    return unsubscribe;
  }, []);

  return { ...storeData, ...progressStoreData };
}

function StudentActivitySummaryPageContent() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string; // This is the LRN

  // Use the stable store data hook to prevent infinite loops
  const {
    modules,
    loadModules,
    progress,
    loadProgress,
    progressLoading,
    students,
    loadStudents,
    getFilteredStudents,
    // updateActivity,
    // deleteActivity,
    fetchStudents,
  } = useStableStoreData();

  // Create our own getStudentByLrn function using main store data with fallback
  const getStudentByLrn = useCallback(
    (lrn: string) => {
      // First try to find in store data
      let found = students.find((student) => student.lrn === lrn);

      // If not found in store, use static data as fallback
      if (!found) {
        found = studentsData.find((student) => student.lrn === lrn) as
          | Student
          | undefined;
      }

      return found;
    },
    [students]
  );

  // Local state
  const [student, setStudent] = useState<Student | null>(null);
  const [studentProgress, setStudentProgress] = useState<Progress[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load data on mount with proper error handling - run once only
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsInitialLoading(true);

        // Load data from progress store (main store actions are not available)
        if (student) {
          const res = await fetchProgress(student.lrn);
          setStudentProgress(res);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, [student]); // Run on student update

  // Get student data when studentId changes - with API fallback
  useEffect(() => {
    const loadStudent = async () => {
      if (!studentId) return;
      
      setIsInitialLoading(true);
      
      try {
        // First try to find in store
        let foundStudent: Student | null = null;
        
        if (getStudentByLrn) {
          foundStudent = getStudentByLrn(studentId) || null;
        }
        
        // If not found in store, try to fetch from API
        if (!foundStudent) {
          try {
            // Fetch directly from API
            const allStudents = await apiFetchStudents();
            foundStudent = allStudents.find((s) => s.lrn === studentId) || null;
            
            // If found, also ensure store is updated (but don't wait)
            if (fetchStudents && foundStudent) {
              fetchStudents().catch(err => console.error("Error updating store:", err));
            }
          } catch (error) {
            console.error("Error fetching students from API:", error);
          }
        }
        
        // Final fallback to static data
        if (!foundStudent) {
          const staticStudent = studentsData.find((s) => s.lrn === studentId) as any;
          if (staticStudent) {
            foundStudent = {
              ...staticStudent,
              _id: (staticStudent._id || staticStudent.lrn || `student-${Math.random()}`) as string
            } as Student;
          }
        }
        
        setStudent(foundStudent || null);
      } catch (error) {
        console.error("Error loading student:", error);
        setStudent(null);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    loadStudent();
  }, [studentId, getStudentByLrn, fetchStudents]); // Include fetchStudents - will use apiFetchStudents as fallback

  // Create stable empty arrays for memoization
  const emptyStudentProgress = useMemo(() => [], []);
  const emptyAvailableModules = useMemo(() => [], []);

  // Memoize student progress to prevent recalculation
  const studentProgressRecords = useMemo(async () => {
    if (student) {
      // First try store data
      const progressData = await fetchProgress(student.lrn);
      let progressRecords = progressData.filter((p) => p.studentId === student.lrn);

      return progressRecords;
    }
    return emptyStudentProgress;
  }, [student, progress, emptyStudentProgress]);

  // Load available modules based on student's program
  useEffect(() => {
    const loadAvailableModules = async () => {
      if (!student || !student.program) {
        setAvailableModules([]);
        return;
      }

      try {
        // Always start with static data (most reliable)
        let modulesList: any[] = modulesData as any[];
        
        // Try to fetch from API and merge if available
        try {
          const apiModules = await fetchModules();
          if (apiModules && apiModules.length > 0) {
            modulesList = apiModules;
          }
        } catch (error) {
          // Use static data if API fails
          console.log("Using static modules data");
        }

        // Normalize module IDs and data
        const normalizedModules: Module[] = modulesList.map((module: any) => {
          const levels = Array.isArray(module.levels) 
            ? module.levels.map((l: string) => String(l || '').trim())
            : module.levels 
            ? [String(module.levels).trim()]
            : [];
          
          return {
            ...module,
            _id: module._id || module.id || `module-${Math.random()}`,
            title: module.title || '',
            levels: levels,
            predefinedActivities: module.predefinedActivities || [],
          } as Module;
        });

        // Normalize student program
        const studentProgram = String(student.program || '').trim();
        
        // Filter modules - match program or "All Programs"
        const filtered = normalizedModules.filter((module) => {
          if (!module.levels || module.levels.length === 0) {
            return false;
          }
          
          // Check for exact match or "All Programs"
          const hasProgram = module.levels.some(level => 
            level === studentProgram || level === "All Programs"
          );
          
          return hasProgram;
        });

        // If no filtered modules, show all modules as fallback (for debugging)
        if (filtered.length === 0 && normalizedModules.length > 0) {
          console.warn(`No modules found for program "${studentProgram}". Showing all modules.`);
          setAvailableModules(normalizedModules.slice(0, 10)); // Show first 10 as fallback
        } else {
          setAvailableModules(filtered);
        }
      } catch (error) {
        console.error("Error loading modules:", error);
        // Last resort: use static data directly
        const staticModules: Module[] = (modulesData as any[]).map((m: any) => ({
          ...m,
          _id: m.id || m._id || `module-${Math.random()}`,
          title: m.title || '',
          levels: Array.isArray(m.levels) ? m.levels : (m.levels ? [m.levels] : []),
          predefinedActivities: m.predefinedActivities || [],
        })) as Module[];
        setAvailableModules(staticModules);
      }
    };

    loadAvailableModules();
  }, [student]);

  // Update state when data changes
  useEffect(() => {
    (async () => {
      const records = await studentProgressRecords;
      setStudentProgress(records);
    })();
  }, [studentProgressRecords]);

  // Set first available module as selected if none selected
  useEffect(() => {
    if (!selectedModule && availableModules.length > 0) {
      setSelectedModule(availableModules[0]._id);
    }
  }, [selectedModule, availableModules]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push("/progress");
  }, [router]);

  // Create stable empty array for navigation
  const emptyFilteredStudents = useMemo(() => [], []);

  // Memoize navigation info to prevent recalculation
  const navigationInfo = useMemo(() => {
    if (!getFilteredStudents)
      return {
        filteredStudents: emptyFilteredStudents,
        currentStudentIndex: -1,
        hasPrevious: false,
        hasNext: false,
      };

    const filteredStudents = getFilteredStudents();
    const currentStudentIndex = filteredStudents.findIndex(
      (s: Student) => s.lrn === studentId
    );
    return {
      filteredStudents,
      currentStudentIndex,
      hasPrevious: currentStudentIndex > 0,
      hasNext: currentStudentIndex < filteredStudents.length - 1,
    };
  }, [getFilteredStudents, studentId, emptyFilteredStudents]);

  const { filteredStudents, currentStudentIndex, hasPrevious, hasNext } =
    navigationInfo;

  // Handle student navigation with useCallback to prevent recreation
  const handlePreviousStudent = useCallback(() => {
    if (hasPrevious && !isNavigating) {
      setIsNavigating(true);
      const previousStudent = filteredStudents[currentStudentIndex - 1];
      router.push(`/progress/${previousStudent.lrn}`);
      // Reset navigation state after a short delay
      setTimeout(() => setIsNavigating(false), 500);
    }
  }, [
    hasPrevious,
    isNavigating,
    filteredStudents,
    currentStudentIndex,
    router,
  ]);

  const handleNextStudent = useCallback(() => {
    if (hasNext && !isNavigating) {
      setIsNavigating(true);
      const nextStudent = filteredStudents[currentStudentIndex + 1];
      router.push(`/progress/${nextStudent.lrn}`);
      // Reset navigation state after a short delay
      setTimeout(() => setIsNavigating(false), 500);
    }
  }, [hasNext, isNavigating, filteredStudents, currentStudentIndex, router]);

  // Handle keyboard navigation with memoized handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle navigation if no input/textarea is focused
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePreviousStudent();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNextStudent();
      }
    },
    [handlePreviousStudent, handleNextStudent]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Activity handlers with useCallback to prevent recreation
  const handleActivityUpdate = useCallback(
    async (activityIndex: number, activity: Activity) => {
      try {
        if (!student) {
          alert("Student information not available.");
          return;
        }

        // Check if this is a new activity (activityIndex === -1)
        if (activityIndex === -1) {
          // Check if progress record exists for this module
          const existingProgress = studentProgress.find(p => p.moduleId === selectedModule);
          
          if (existingProgress) {
            // Add activity to existing progress record via API
            const baseUrl = ((globalThis as any).process?.env?.NEXT_PUBLIC_BASE_URL) || '';
            const res = await fetch(`${baseUrl}/api/progress`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: student.lrn,
                moduleId: selectedModule,
                activity: activity,
                action: 'add' // Indicate this is an add operation
              })
            });

            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || 'Failed to add activity');
            }
          } else {
            // Create new progress record with this activity
            const newProgress = {
              studentId: student.lrn,
              barangayId: student.barangayId,
              moduleId: selectedModule,
              activities: [activity]
            };
            
            await createProgress(newProgress as any);
          }
        } else {
          // Update existing activity
          await updateProgress(
            studentId,
            selectedModule,
            activityIndex,
            activity
          );
        }

        // Refresh progress data
        if (student) {
          const res = await fetchProgress(student.lrn);
          setStudentProgress(res);
        }
        setShowEditSuccess(true);
        setTimeout(() => setShowEditSuccess(false), 3000);
      } catch (error) {
        console.error("Error saving activity:", error);
        alert(`Failed to ${activityIndex === -1 ? 'add' : 'update'} activity. Please try again.`);
      }
    },
    [studentId, selectedModule, fetchProgress, student, studentProgress]
  );

  const handleActivityDelete = useCallback(
    async (activityIndex: number) => {
      try {
        await deleteProgress(studentId, selectedModule, activityIndex);
        // Refresh progress data from progress store
        if (student) {
          const res = await fetchProgress(student.lrn);
          setStudentProgress(res);
        }
        setShowEditSuccess(true);
        setTimeout(() => setShowEditSuccess(false), 3000);
      } catch (error) {
        console.error("Error deleting activity:", error);
        alert("Failed to delete activity. Please try again.");
      }
    },
    [studentId, selectedModule, fetchProgress]
  );

  // Get current module progress with memoization
  const currentModuleProgress = useMemo(() => {
    return studentProgress.find((p) => p.moduleId === selectedModule);
  }, [studentProgress, selectedModule]);

  // Show loading state during initial data load
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg border-4 border-blue-600 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading student data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while initializing
  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleBack}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Progress
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading student data...</p>
        </div>
      </div>
    );
  }

  // Show error state if student not found after loading
  if (!student) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleBack}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Progress
          </Button>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">Student not found.</p>
          <p className="text-sm text-gray-400 mt-2">LRN: {studentId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-4 border-blue-600 dark:border-blue-500 mx-4 my-4">
        {/* Student Information Header */}
        <div className="bg-gray-100 dark:bg-slate-700 p-6 rounded-t-lg border-b-4 border-blue-600 dark:border-blue-500">
          <div className="flex items-center justify-between">
            {/* Left side - Back button, navigation, and student info */}
            <div className="flex items-center gap-6">
              {/* Back Arrow */}
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
                className="bg-red-800 dark:bg-red-900 text-white hover:bg-red-900 dark:hover:bg-red-800 p-2 rounded"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              {/* Student Image */}
              <div className="relative h-16 w-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                {student.image ? (
                  <Image
                    src={student.image}
                    alt={student.name}
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                ) : null}
                {/* Initials fallback */}
                <span className="text-gray-600 dark:text-gray-300 font-bold text-lg">
                  {student.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()}
                </span>
              </div>

              {/* Student Details */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase">
                  {student.name}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {student.lrn}
                </p>
              </div>
            </div>

            {/* Right side - Program info */}
            <div className="text-right">
              <p className="text-gray-900 dark:text-white font-medium">
                {student.program}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Group {student.group}
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showEditSuccess && (
          <div className="mx-6 mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded">
            ✓ Activity updated successfully!
          </div>
        )}

        {/* Modules Section */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Modules
            </h3>
            {student && (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Selected Student: <span className="font-semibold text-gray-900 dark:text-white">{student.name}</span> <span className="text-gray-500">({student.lrn})</span>
              </div>
            )}
          </div>

          {/* Module Tabs */}
          {availableModules.length > 0 ? (
            <Tabs
              value={selectedModule}
              onValueChange={setSelectedModule}
              className="w-full"
            >
              <div className="border-b border-gray-300 dark:border-gray-600">
                {/* Responsive, wrapping module cards */}
                <div className="px-1">
                  <TabsList className="w-full !bg-transparent !h-auto rounded-none p-0 flex flex-wrap gap-3 justify-start items-stretch">
                    {availableModules.map((module) => (
                      <TabsTrigger
                        key={module._id}
                        value={module._id}
                        className={`flex flex-col items-start justify-between text-left font-semibold whitespace-normal break-words
                          min-w-[180px] sm:min-w-[200px] md:min-w-[220px] max-w-full
                          px-3 sm:px-4 py-3 rounded-lg border shadow-sm text-xs sm:text-sm md:text-base
                          transition-all duration-200
                          ${
                            selectedModule === module._id
                              ? "!bg-blue-600 dark:!bg-blue-700 !text-white border-blue-600 dark:border-blue-500 shadow-md scale-[1.01]"
                              : "bg-white dark:bg-slate-800 !text-gray-800 dark:!text-gray-100 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-400"
                          }`}
                      >
                        <span className="block leading-snug sm:leading-normal break-words line-clamp-2">
                          {module.title}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>

              {/* Module Content */}
              {availableModules.map((module) => (
                <TabsContent key={module._id} value={module._id} className="mt-0">
                  <div className="p-0">
                    {progressLoading ? (
                      <ActivityTableSkeleton />
                    ) : (
                      <ActivityTable
                        activities={currentModuleProgress?.activities || []}
                        moduleTitle={module.title}
                        studentId={studentId}
                        moduleId={module._id}
                        onActivityUpdate={handleActivityUpdate}
                        onActivityDelete={handleActivityDelete}
                        // Student navigation props
                        currentStudentIndex={currentStudentIndex}
                        totalStudents={filteredStudents.length}
                        hasPrevious={hasPrevious}
                        hasNext={hasNext}
                        onPreviousStudent={handlePreviousStudent}
                        onNextStudent={handleNextStudent}
                        isNavigating={isNavigating}
                        // Predefined activities for quick add
                        predefinedActivities={module.predefinedActivities}
                      />
                    )}
              </div>
            </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No modules available for this student's program.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap with error boundary to handle any remaining issues
export default function StudentActivitySummaryPage() {
  return (
    <ErrorBoundary children={<StudentActivitySummaryPageContent />} />
  );
}
