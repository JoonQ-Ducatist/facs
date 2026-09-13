-- The upload UI accepts iPhone HEIC/HEIF and GIF images. Keep Storage's
-- authoritative allow-list aligned with that product contract.
update storage.buckets
   set allowed_mime_types = array[
     'image/jpeg',
     'image/png',
     'image/webp',
     'image/gif',
     'image/heic',
     'image/heif',
     'video/mp4',
     'video/webm',
     'video/quicktime'
   ]
 where id = 'facs-media';
