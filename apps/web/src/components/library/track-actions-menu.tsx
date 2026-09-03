'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, MoreHorizontal, Share2, Trash2 } from 'lucide-react';
import type { TrackVisibility } from '@trackzone/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ShareDialog } from '@/components/library/share-dialog';

export interface CollectionOption {
  id: string;
  name: string;
}

export function TrackActionsMenu({
  trackId,
  trackTitle,
  visibility,
  favorite,
  collections = [],
}: {
  trackId: string;
  trackTitle: string;
  visibility: TrackVisibility;
  favorite: boolean;
  collections?: CollectionOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  async function toggleFavorite() {
    setPending(true);
    await fetch(`/api/tracks/${trackId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ favorite: !favorite }),
    });
    setPending(false);
    router.refresh();
  }

  async function setVisibility(next: 'private' | 'public') {
    setPending(true);
    await fetch(`/api/tracks/${trackId}/visibility`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visibility: next }),
    });
    setPending(false);
    router.refresh();
  }

  async function addToCollection(collectionId: string) {
    setPending(true);
    await fetch(`/api/collections/${collectionId}/tracks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trackId }),
    });
    setPending(false);
    router.refresh();
  }

  async function deleteTrack() {
    setPending(true);
    await fetch(`/api/tracks/${trackId}`, { method: 'DELETE' });
    setPending(false);
    setDeleteOpen(false);
    router.refresh();
  }

  return (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending} aria-label="Track actions">
            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void toggleFavorite()}>
            {favorite ? 'Remove from favorites' : 'Add to favorites'}
          </DropdownMenuItem>

          {collections.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Add to collection</DropdownMenuLabel>
              {collections.map((collection) => (
                <DropdownMenuItem
                  key={collection.id}
                  onSelect={() => void addToCollection(collection.id)}
                >
                  <FolderPlus className="h-3.5 w-3.5" aria-hidden />
                  <span className="truncate">{collection.name}</span>
                </DropdownMenuItem>
              ))}
            </>
          ) : null}

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Visibility</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={visibility === 'private'}
            onSelect={() => void setVisibility('private')}
          >
            Private
            {visibility === 'private' ? ' · current' : ''}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShareOpen(true)}>
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            Share…{visibility === 'shared' ? ' · current' : ''}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={visibility === 'public'}
            onSelect={() => void setVisibility('public')}
          >
            Public
            {visibility === 'public' ? ' · current' : ''}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-danger data-[highlighted]:bg-danger/10"
              onSelect={(e) => e.preventDefault()}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogTitle className="text-fg text-sm font-medium">
          Delete this track?
        </AlertDialogTitle>
        <AlertDialogDescription>
          This removes the track and its file from TrackZone. This cannot be undone.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel />
          <AlertDialogAction disabled={pending} onClick={() => void deleteTrack()}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>

      <ShareDialog
        trackId={trackId}
        trackTitle={trackTitle}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </AlertDialog>
  );
}
