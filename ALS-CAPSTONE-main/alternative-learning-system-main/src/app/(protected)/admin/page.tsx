"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/store/auth-store";
import { useStudentStore } from "@/store/student-store";
import { User, RegisterCredentials } from "@/types/auth";
import { registerSchema } from "@/validators/auth-validators";
import { authService } from "@/services/auth-service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Edit,
  Plus,
  Users,
  Calendar,
  Mail,
  MapPin,
} from "lucide-react";

export default function AdminManagementPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.auth.user);
  const [admins, setAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Get barangays from store
  const { barangays, fetchBarangays } = useStudentStore();

  // Form for creating new admin
  const createForm = useForm<RegisterCredentials>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      gender: "",
      birthday: "",
      role: "admin",
      assignedBarangayId: "",
      acceptTerms: true,
    },
  });

  // Watch the role field to conditionally show/hide barangay assignment
  const watchedRole = createForm.watch("role");

  // Clear barangay assignment when role changes to master_admin
  useEffect(() => {
    if (watchedRole === "master_admin") {
      createForm.setValue("assignedBarangayId", "");
    }
  }, [watchedRole, createForm]);

  // Form for editing admin
  const editForm = useForm<Partial<RegisterCredentials>>({
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      gender: "",
      birthday: "",
      assignedBarangayId: "",
    },
  });

  // Redirect if not a master admin
  useEffect(() => {
    if (user && user.role !== "master_admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Load barangays and admins
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Load barangays
      await fetchBarangays();

      // Load admins
      await loadAdmins();

      setIsLoading(false);
    };

    loadData();
  }, [fetchBarangays]);

  // Load admins from storage
  const loadAdmins = async () => {
    try {
      const users = await authService.getStoredUsers();
      setAdmins(users);
    } catch (error) {
      console.error("Error loading admins:", error);
    }
  };

  // Get barangay name by ID
  const getBarangayName = (barangayId: string) => {
    const barangay = barangays.find((b) => b._id === barangayId);
    return barangay ? barangay.name : "Unknown";
  };

  // Handle create admin
  const handleCreateAdmin = async (data: RegisterCredentials) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await authService.register(data);
      await loadAdmins(); // Reload the admin list
      setIsCreateDialogOpen(false);
      createForm.reset();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create admin"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit admin
  const handleEditAdmin = async (data: Partial<RegisterCredentials>) => {
    if (!editingAdmin) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Update admin in storage
      const success = await authService.updateStoredUser({
        ...data,
        _id: editingAdmin._id,
      });

      if (success) {
        await loadAdmins();
        setIsEditDialogOpen(false);
        setEditingAdmin(null);
        editForm.reset();
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update admin"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete admin
  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm("Are you sure you want to delete this admin account?")) return;

    try {
      const success = await authService.deleteStoredUser(adminId);
      if (success) {
        await loadAdmins();
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
    }
  };

  // Open edit dialog
  const openEditDialog = (admin: User) => {
    setEditingAdmin(admin);
    console.log(admin);
    editForm.reset({
      firstName: admin.firstName || "",
      middleName: admin.middleName || "",
      lastName: admin.lastName || "",
      email: admin.email,
      gender: admin.gender || "",
      birthday: admin.birthday || "",
      assignedBarangayId: admin.assignedBarangayId || "",
    });
    setIsEditDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            ADMIN MANAGEMENT
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage administrator accounts for the Alternative Learning System
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-600 hover:border-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add New Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-4 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-blue-800 dark:text-blue-300">
                Create New Admin Account
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Create a new Master Admin or Regular Admin account for the
                system
              </DialogDescription>
            </DialogHeader>

            {submitError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded text-sm">
                {submitError}
              </div>
            )}

            <form
              onSubmit={createForm.handleSubmit(handleCreateAdmin)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="firstName"
                    className="text-gray-900 dark:text-white"
                  >
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    {...createForm.register("firstName")}
                    className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    disabled={isSubmitting}
                  />
                  {createForm.formState.errors.firstName && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                      {createForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="lastName"
                    className="text-gray-900 dark:text-white"
                  >
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    {...createForm.register("lastName")}
                    className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    disabled={isSubmitting}
                  />
                  {createForm.formState.errors.lastName && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                      {createForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label
                  htmlFor="middleName"
                  className="text-gray-900 dark:text-white"
                >
                  Middle Name
                </Label>
                <Input
                  id="middleName"
                  {...createForm.register("middleName")}
                  className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label
                  htmlFor="email"
                  className="text-gray-900 dark:text-white"
                >
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...createForm.register("email")}
                  className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  disabled={isSubmitting}
                />
                {createForm.formState.errors.email && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    {createForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="password"
                    className="text-gray-900 dark:text-white"
                  >
                    Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...createForm.register("password")}
                    className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    disabled={isSubmitting}
                  />
                  {createForm.formState.errors.password && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                      {createForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="confirmPassword"
                    className="text-gray-900 dark:text-white"
                  >
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...createForm.register("confirmPassword")}
                    className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    disabled={isSubmitting}
                  />
                  {createForm.formState.errors.confirmPassword && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                      {createForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="gender"
                    className="text-gray-900 dark:text-white"
                  >
                    Gender
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      createForm.setValue("gender", value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-2 border-blue-600 dark:border-blue-500">
                      <SelectItem
                        value="male"
                        className="text-gray-900 dark:text-white"
                      >
                        Male
                      </SelectItem>
                      <SelectItem
                        value="female"
                        className="text-gray-900 dark:text-white"
                      >
                        Female
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="birthday"
                    className="text-gray-900 dark:text-white"
                  >
                    Birthday
                  </Label>
                  <Input
                    id="birthday"
                    type="date"
                    {...createForm.register("birthday")}
                    className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="role" className="text-gray-900 dark:text-white">
                  Role *
                </Label>
                <Select
                  onValueChange={(value) =>
                    createForm.setValue(
                      "role",
                      value as "master_admin" | "admin"
                    )
                  }
                  disabled={isSubmitting}
                  defaultValue="admin"
                >
                  <SelectTrigger className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-2 border-blue-600 dark:border-blue-500">
                    <SelectItem
                      value="admin"
                      className="text-gray-900 dark:text-white"
                    >
                      Regular Admin
                    </SelectItem>
                    <SelectItem
                      value="master_admin"
                      className="text-gray-900 dark:text-white"
                    >
                      Master Admin
                    </SelectItem>
                  </SelectContent>
                </Select>
                {createForm.formState.errors.role && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    {createForm.formState.errors.role.message}
                  </p>
                )}
              </div>

              {/* Only show barangay assignment for Regular Admin */}
              {watchedRole === "admin" && (
                <div>
                  <Label
                    htmlFor="assignedBarangayId"
                    className="text-gray-900 dark:text-white"
                  >
                    Assigned Barangay *
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      createForm.setValue("assignedBarangayId", value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                      <SelectValue placeholder="Select barangay" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-2 border-blue-600 dark:border-blue-500">
                      {barangays.map((barangay) => (
                        <SelectItem
                          key={barangay._id}
                          value={barangay._id}
                          className="text-gray-900 dark:text-white"
                        >
                          {barangay.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {createForm.formState.errors.assignedBarangayId && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                      {createForm.formState.errors.assignedBarangayId.message}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    createForm.reset();
                    setSubmitError(null);
                  }}
                  disabled={isSubmitting}
                  className="border-2 border-gray-300 dark:border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-600 hover:border-blue-700"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Admin List */}
      <Card className="bg-white dark:bg-slate-800 border-4 border-blue-600 dark:border-blue-500">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Administrator Accounts
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Manage all administrator accounts in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-300">
                Loading administrators...
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-200 dark:divide-blue-600 border-4 border-blue-600 dark:border-blue-500 rounded-lg">
                <thead className="bg-blue-600 dark:bg-blue-700">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                    >
                      Role
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                    >
                      Assigned Barangay
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                    >
                      Created Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-700 divide-y divide-blue-200 dark:divide-blue-600">
                  {admins.map((admin) => (
                    <tr
                      key={admin._id}
                      className="hover:bg-blue-50 dark:hover:bg-slate-600"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {admin.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {admin.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            admin.role === "master_admin"
                              ? "default"
                              : "secondary"
                          }
                          className={`${
                            admin.role === "master_admin"
                              ? "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-600"
                              : "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-600"
                          }`}
                        >
                          {admin.role === "master_admin"
                            ? "Master Admin"
                            : "Regular Admin"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {admin.role === "admin" && admin.assignedBarangayId
                              ? getBarangayName(admin.assignedBarangayId)
                              : "All Barangays"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {formatDate(admin.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(admin)}
                            className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {admin.role !== "master_admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteAdmin(admin._id)}
                              className="border-red-600 text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {admins.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        No administrators found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-4 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-blue-800 dark:text-blue-300">
              Edit Admin Account
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Update admin account information
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded text-sm">
              {submitError}
            </div>
          )}

          <form
            onSubmit={editForm.handleSubmit(handleEditAdmin)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="editFirstName"
                  className="text-gray-900 dark:text-white"
                >
                  First Name *
                </Label>
                <Input
                  id="editFirstName"
                  {...editForm.register("firstName")}
                  className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  disabled={isSubmitting}
                />
                {editForm.formState.errors.firstName && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    {editForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="editLastName"
                  className="text-gray-900 dark:text-white"
                >
                  Last Name *
                </Label>
                <Input
                  id="editLastName"
                  {...editForm.register("lastName")}
                  className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  disabled={isSubmitting}
                />
                {editForm.formState.errors.lastName && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    {editForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label
                htmlFor="editMiddleName"
                className="text-gray-900 dark:text-white"
              >
                Middle Name
              </Label>
              <Input
                id="editMiddleName"
                {...editForm.register("middleName")}
                className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label
                htmlFor="editEmail"
                className="text-gray-900 dark:text-white"
              >
                Email *
              </Label>
              <Input
                id="editEmail"
                type="email"
                {...editForm.register("email")}
                className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                disabled={isSubmitting}
              />
              {editForm.formState.errors.email && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {editForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="editGender"
                  className="text-gray-900 dark:text-white"
                >
                  Gender
                </Label>
                <Select
                  onValueChange={(value) => editForm.setValue("gender", value)}
                  disabled={isSubmitting}
                  defaultValue={editingAdmin?.gender || ""}
                >
                  <SelectTrigger className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-2 border-blue-600 dark:border-blue-500">
                    <SelectItem
                      value="male"
                      className="text-gray-900 dark:text-white"
                    >
                      Male
                    </SelectItem>
                    <SelectItem
                      value="female"
                      className="text-gray-900 dark:text-white"
                    >
                      Female
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="editBirthday"
                  className="text-gray-900 dark:text-white"
                >
                  Birthday
                </Label>
                <Input
                  id="editBirthday"
                  type="date"
                  {...editForm.register("birthday")}
                  className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {editingAdmin?.role === "admin" && (
              <div>
                <Label
                  htmlFor="editAssignedBarangayId"
                  className="text-gray-900 dark:text-white"
                >
                  Assigned Barangay *
                </Label>
                <Select
                  onValueChange={(value) =>
                    editForm.setValue("assignedBarangayId", value)
                  }
                  disabled={isSubmitting}
                  defaultValue={editingAdmin?.assignedBarangayId || ""}
                >
                  <SelectTrigger className="border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select barangay" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-2 border-blue-600 dark:border-blue-500">
                    {barangays.map((barangay) => (
                      <SelectItem
                        key={barangay._id}
                        value={barangay._id}
                        className="text-gray-900 dark:text-white"
                      >
                        {barangay.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editForm.formState.errors.assignedBarangayId && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    {editForm.formState.errors.assignedBarangayId.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingAdmin(null);
                  editForm.reset();
                  setSubmitError(null);
                }}
                disabled={isSubmitting}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-600 hover:border-blue-700"
              >
                {isSubmitting ? "Updating..." : "Update Admin"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
