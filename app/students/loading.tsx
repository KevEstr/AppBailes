import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function StudentsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        {/* Header Skeleton */}
        <Card className="mb-8 rounded-2xl bg-gray-800/90 p-6 shadow-xl border border-gray-600 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-20 bg-gray-700" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-16 bg-gray-700" />
                <Skeleton className="h-6 w-4 bg-gray-700" />
                <Skeleton className="h-6 w-32 bg-gray-700" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-8 w-48 bg-gray-700 mb-2" />
              <Skeleton className="h-4 w-32 bg-gray-700" />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-gray-800/90 border-gray-600">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-4 w-20 bg-gray-700 mb-2" />
                      <Skeleton className="h-8 w-12 bg-gray-700" />
                    </div>
                    <Skeleton className="h-8 w-8 bg-gray-700 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search and Filters Skeleton */}
          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <Skeleton className="h-6 w-64 bg-gray-700" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Skeleton className="h-10 flex-1 bg-gray-700" />
                <Skeleton className="h-10 w-48 bg-gray-700" />
                <Skeleton className="h-10 w-24 bg-gray-700" />
              </div>
            </CardContent>
          </Card>

          {/* Table Skeleton */}
          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <Skeleton className="h-6 w-48 bg-gray-700" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Table Header */}
                <div className="grid grid-cols-7 gap-4 pb-4 border-b border-gray-600">
                  {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-4 bg-gray-700" />
                  ))}
                </div>
                
                {/* Table Rows */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-7 gap-4 py-4 border-b border-gray-700">
                    {[...Array(7)].map((_, j) => (
                      <div key={j} className="space-y-2">
                        <Skeleton className="h-4 bg-gray-700" />
                        {j < 3 && <Skeleton className="h-3 bg-gray-700" />}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 