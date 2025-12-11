import { currentUser } from "@clerk/nextjs/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserButton } from "@clerk/nextjs";

export default async function SettingsPage() {
  const user = await currentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Manage your account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-16 h-16",
                }
              }}
            />
            <div>
              <p className="font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-muted-foreground">{user?.emailAddresses?.[0]?.emailAddress}</p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">Account Details</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
