# Photo Upload Feature Added to Regular Loan Application

## Summary
Successfully added customer photo upload functionality to the **Regular Loan Application** form (AddLoanModal component) with Supabase bucket integration.

## Changes Made

### 1. Added Photo Upload State
```typescript
const [photoUpload, setPhotoUpload] = useState<{
  file: File | null
  preview: string | null
  uploading: boolean
  uploadedUrl: string | null
}>({
  file: null,
  preview: null,
  uploading: false,
  uploadedUrl: null
})
```

### 2. Added Photo Upload Handlers

#### `handlePhotoChange`
- Validates file type (images only)
- Validates file size (max 5MB)
- Creates preview URL for selected image

#### `uploadPhoto`
- Uploads photo to Supabase Storage bucket (`MRGroups`)
- Generates unique filename with timestamp and random string
- Stores in `customer-photos/` folder
- Returns public URL after successful upload
- Includes detailed error handling and user alerts

### 3. Updated Customer Creation/Update Logic
- Photo is uploaded **before** creating/updating customer
- Photo URL is included in customer data:
  - For **new customers**: Added to insert query
  - For **existing customers**: Added to update query
- Photo URL stored in `photo_url` field of `customers` table

### 4. Added Photo Upload UI Section
Located in Customer Information section with:
- **Choose Photo** button (blue, with icon)
- **Live preview** (32x32 thumbnail)
- **Upload status** indicator
- **Success message** with checkmark
- **File format info** (JPG, PNG, WEBP, max 5MB)

## Features

### User Experience
✅ Click "Choose Photo" button to select image  
✅ Instant preview after selection  
✅ Button shows "Uploading..." during upload  
✅ Button changes to "Change Photo" after successful upload  
✅ Green success message with checkmark icon  
✅ Preview shows selected image before/during/after upload  

### Validation
✅ Image files only (validated by MIME type)  
✅ Maximum 5MB file size  
✅ Error messages for invalid files  
✅ Bucket connection error handling  

### Supabase Integration
✅ Bucket name: `MRGroups`  
✅ Folder structure: `customer-photos/[timestamp]_[random].[ext]`  
✅ Public URLs generated automatically  
✅ Proper error handling for bucket/connection issues  

## Database Schema Required

The `customers` table must have a `photo_url` field (TEXT/VARCHAR):

```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

## Testing Checklist

- [ ] Photo upload button is visible and clickable
- [ ] File picker opens when clicking "Choose Photo"
- [ ] Image preview appears after selection
- [ ] Upload completes successfully
- [ ] Success message displays
- [ ] Photo URL is saved to customer record
- [ ] Existing customer updates include photo
- [ ] New customer creation includes photo
- [ ] Error handling works (wrong file type, large file, etc.)

## Files Modified

1. **`src/components/AddLoanModal.tsx`**
   - Added photo upload state
   - Added handler functions
   - Added UI section with button and preview
   - Updated customer creation/update logic

## Usage

When creating a new regular loan application:
1. Navigate to Dashboard → Add Loan (+) button
2. Fill in customer details
3. Scroll to "Customer Photo" section
4. Click "Choose Photo" button
5. Select an image file
6. Preview appears automatically
7. Photo uploads automatically when form is submitted
8. Photo URL is saved with customer record

## Notes

- Photo upload is **optional** (not required for loan creation)
- Photos are stored in Supabase Storage under `customer-photos/` folder
- Each photo gets a unique filename to prevent overwrites
- The same photo upload functionality is already working in `/new-loan` page
