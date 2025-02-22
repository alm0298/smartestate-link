// New page for user management
export const UserManagement = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*');
      return data;
    }
  });

  const { mutate: deleteUser } = useMutation({
    mutationFn: async (userId) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      if (error) throw error;
    }
  });
}; 