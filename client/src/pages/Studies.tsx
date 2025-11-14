import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Eye } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Studies() {
  const { data: studies, isLoading } = trpc.studies.list.useQuery();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'reported':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'urgent':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Studies</h1>
          <p className="text-muted-foreground mt-1">
            View and manage DICOM studies
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Studies</CardTitle>
            <CardDescription>
              Browse all DICOM studies in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading studies...
              </div>
            ) : !studies || studies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No studies found</p>
                <p className="text-sm mt-1">Upload your first DICOM study to get started</p>
              </div>
            ) : (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Study Date</TableHead>
                      <TableHead>Modality</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Body Part</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studies.map((item) => (
                      <TableRow key={item.study.id}>
                        <TableCell className="font-medium">
                          {item.patient?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {new Date(item.study.studyDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {item.study.modality}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.study.description || "N/A"}
                        </TableCell>
                        <TableCell>{item.study.bodyPart || "N/A"}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(item.study.priority)}`}>
                            {item.study.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.study.status)}`}>
                            {item.study.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/studies/${item.study.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
