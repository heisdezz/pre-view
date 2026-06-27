import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ensureMediaLibraryPermission, hasMediaLibraryPermission } from '@/client/media';

const MEDIA_PERMISSION_QUERY_KEY = ['media-permission'] as const;

export function useMediaPermission() {
  const queryClient = useQueryClient();

  const permissionQuery = useQuery({
    queryKey: MEDIA_PERMISSION_QUERY_KEY,
    queryFn: hasMediaLibraryPermission,
  });

  const requestPermission = useMutation({
    mutationFn: ensureMediaLibraryPermission,
    onSettled: () => queryClient.invalidateQueries({ queryKey: MEDIA_PERMISSION_QUERY_KEY }),
  });

  return {
    isGranted: permissionQuery.data ?? false,
    isChecking: permissionQuery.isPending,
    request: requestPermission.mutate,
    isRequesting: requestPermission.isPending,
    requestError: requestPermission.error,
  };
}
