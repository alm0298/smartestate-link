
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Clients = () => {
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "client");
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Clients</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clients?.map((client) => (
          <Card key={client.id}>
            <CardHeader>
              <CardTitle className="text-lg">{client.full_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Clients;
