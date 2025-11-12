'use client';

import { useState, useEffect } from 'react';
import { useStudentStore } from '@/store/student-store';
import { useAuthStoreState } from '@/store/auth-store';
import { Student } from '@/types';
import { StudentFormValues } from '@/validators/student-validators';

// Components
import { Button } from '@/components/ui/button';
import { BarangayTabs } from '@/components/students/barangay-tabs';
import { BarangayTabsSkeleton } from '@/components/students/barangay-tabs-skeleton';

import { StudentTable } from '@/components/students/student-table';
import { StudentTableSkeleton } from '@/components/students/student-table-skeleton';
import { StudentDialog } from '@/components/students/student-dialog';
import { StudentDetailsDialog } from '@/components/students/student-details-dialog';
import { ConfirmationDialog } from '@/components/students/confirmation-dialog';
import { Plus } from 'lucide-react';

export default function StudentsPage() {
  // Get user from auth store
  const { user } = useAuthStoreState();

  // Get student store state and actions
  const {
    students,
    barangays,
    selectedBarangay,
    loadingBarangays,
    setSelectedBarangay,
    addStudent,
    editStudent,
    removeStudent,
    initializeWithUser
  } = useStudentStore();

  // Local state for dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Fetch data on component mount with user context for proper barangay selection
  useEffect(() => {
    initializeWithUser(user);
  }, [initializeWithUser, user]);

  // For regular admin, the barangay selection will be automatically handled
  // by the store when barangays are loaded (it will auto-select their assigned barangay)
  // Since filteredBarangays will only contain their assigned barangay, this works correctly

  // Handle add student
  const handleAddStudent = async (data: StudentFormValues): Promise<void> => {
    await addStudent({
      ...data,
      assessment: data.assessment || '',
      image: data.image || '/images/students/default-avatar.png'
    });
  };

  // Handle edit student
  const handleEditStudent = async (data: StudentFormValues): 
  Promise<void> => {
    if (!selectedStudent) {
      throw new Error('No student selected for editing');
    }
    console.log('Editing student:', selectedStudent);
    await editStudent({
      ...data,
      _id: selectedStudent._id,
      assessment: data.assessment || '',
      image: data.image || selectedStudent.image
    });
  };

  // Handle delete student
  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;

    try {
      await removeStudent(selectedStudent._id);
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  // Open edit dialog
  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student);
    setDeleteDialogOpen(true);
  };

  // Open details dialog
  const openDetailsDialog = (student: Student) => {
    setSelectedStudent(student);
    setDetailsDialogOpen(true);
  };

  // Filter barangays based on user role
  const filteredBarangays = user?.role === 'admin' && user?.assignedBarangayId
    ? barangays.filter(b => b._id === user.assignedBarangayId)
    : barangays;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">STUDENT MASTERLIST</h1>
      </div>

      {/* Barangay Tabs */}
      {loadingBarangays ? (
        <BarangayTabsSkeleton />
      ) : (
        <BarangayTabs
          barangays={filteredBarangays}
          selectedBarangay={selectedBarangay}
          onSelectBarangay={setSelectedBarangay}
        />
      )}

      {/* Student Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-4 border-blue-600 dark:border-blue-500">
        <div className="p-1">
          {students.loading ? (
            <StudentTableSkeleton />
          ) : (
            <StudentTable
              students={students.filteredData}
              barangays={barangays}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
              onRowClick={openDetailsDialog}
            />
          )}
        </div>
      </div>

      {/* Add Student Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-green-600 hover:bg-green-500 cursor-pointer transition-all duration-200 hover:shadow-md"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </div>

      {/* Add Student Dialog */}
      <StudentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="Add New Student"
        description="Fill in the details to add a new student to the system."
        barangays={filteredBarangays}
        user={user}
        onSubmit={handleAddStudent}
      />

      {/* Edit Student Dialog */}
      {selectedStudent && (
        <StudentDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          title="Edit Student"
          description="Update the student's information."
          student={selectedStudent}
          barangays={filteredBarangays}
          user={user}
          onSubmit={handleEditStudent}
        />
      )}

      {/* Student Details Dialog */}
      <StudentDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        student={selectedStudent}
        barangays={barangays}
      />

      {/* Delete Confirmation Dialog */}
      {selectedStudent && (
        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Student"
          description={`Are you sure you want to delete ${selectedStudent.name}? This action cannot be undone.`}
          onConfirm={handleDeleteStudent}
        />
      )}
    </div>
  );
}
