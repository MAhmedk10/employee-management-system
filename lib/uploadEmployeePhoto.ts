'use client'

import { createClient } from '@/lib/supabase/client'

// Uploads a photo to the employee-photos bucket and returns its public URL.
// Storage policies already restrict writes to admins only (checked via
// is_admin() on the storage.objects table), so this is safe to call directly
// from the browser using the admin's own logged-in session — no service
// role key needed here.
export async function uploadEmployeePhoto(file: File, employeeCode: string): Promise<string> {
  const supabase = createClient()
  const fileExt = file.name.split('.').pop()
  const filePath = `${employeeCode}/photo.${fileExt}`

  const { error } = await supabase.storage
    .from('employee-photos')
    .upload(filePath, file, { upsert: true })

  if (error) throw new Error(`Photo upload failed: ${error.message}`)

  const { data } = supabase.storage.from('employee-photos').getPublicUrl(filePath)
  return data.publicUrl
}
