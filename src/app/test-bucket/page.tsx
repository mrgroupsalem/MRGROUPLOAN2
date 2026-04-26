'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestBucket() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testBucketAccess = async () => {
   setLoading(true)
   setResult('Testing...\n\n')

   try {
      // Test 1: Try to list buckets (if you have permission)
     setResult(prev => prev + 'Test 1: Checking storage connection...\n')
      
      // Test 2: Try uploading a tiny test file to MRGroups bucket
     setResult(prev => prev + '\nTest 2: Testing MRGroups bucket...\n')
     const testFile = new Blob(['test'], { type: 'text/plain' })
     const fileName= `test-${Date.now()}.txt`
      
     const { data: uploadData, error: uploadError } = await supabase.storage
        .from('MRGroups')
        .upload(fileName, testFile)
      
      if (uploadError) {
     setResult(prev => prev + `❌ Upload failed: ${uploadError.message}\n`)
     setResult(prev => prev + `Error details: ${JSON.stringify(uploadError, null, 2)}\n`)
      } else {
     setResult(prev => prev + `✅ Upload successful!\n`)
     setResult(prev => prev + `File: ${fileName}\n`)
        
        // Get URL
     const { data: urlData } = supabase.storage
          .from('MRGroups')
          .getPublicUrl(fileName)
        
     setResult(prev => prev + `\nPublic URL: ${urlData.publicUrl}\n`)
      }

      // Test 3: Try with different bucket name variations
     setResult(prev => prev + '\n---\n')
     setResult(prev => prev + 'Testing possible bucket names:\n\n')
      
     const bucketNames = ['MRGroups', 'mrgroups', 'MrGroups', 'MR_GROUPS', 'MR-Groups']
      
      for (const bucketName of bucketNames) {
       try {
         setResult(prev => prev + `Trying "${bucketName}"... `)
          
         const testFileName = `probe-${Date.now()}.txt`
         const { error } = await supabase.storage
            .from(bucketName)
            .upload(testFileName, testFile)
          
          if (error) {
           setResult(prev => prev + `❌ ${error.message}\n`)
          } else {
           setResult(prev => prev + `✅ SUCCESS! This is the correct bucket name!\n`)
            // Clean up test file
            await supabase.storage.from(bucketName).remove([testFileName])
          }
        } catch (e: any) {
         setResult(prev => prev + `❌ Error: ${e.message}\n`)
        }
      }

    } catch (error: any) {
     setResult(prev => prev + `\n❌ Unexpected error: ${error.message}\n`)
    } finally {
     setLoading(false)
    }
  }

  const testDatabaseColumn = async () => {
   setLoading(true)
   setResult(prev => prev + '\n---\n')
   setResult(prev => prev + '\nTesting database photo_url column...\n')
    
   try {
      // Check if photo_url column exists
     const { data, error } = await supabase
        .from('customers')
        .select('id, name, photo_url')
        .limit(1)
      
      if (error) {
       setResult(prev => prev + `❌ Database error: ${error.message}\n`)
      } else {
       setResult(prev => prev + `✅ Database query successful!\n`)
       setResult(prev => prev + `photo_url column exists: YES\n`)
        if (data && data.length > 0) {
         setResult(prev => prev + `\nSample customer:\n`)
         setResult(prev => prev + `ID: ${data[0].id}\n`)
         setResult(prev => prev + `Name: ${data[0].name}\n`)
         setResult(prev => prev + `photo_url: ${data[0].photo_url || 'NULL'}\n`)
        }
      }
    } catch (error: any) {
     setResult(prev => prev + `❌ Error: ${error.message}\n`)
    } finally {
     setLoading(false)
    }
  }

 return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Bucket Diagnostic Tool</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4">Step 1: Test Bucket Access</h2>
          <p className="text-gray-600 mb-4">
            This will test if the MRGroups bucket exists and is accessible.
          </p>
          <button
            onClick={testBucketAccess}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading? 'Testing...' : 'Test Bucket Access'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4">Step 2: Test Database Column</h2>
          <p className="text-gray-600 mb-4">
            Verify the photo_url column exists in customers table.
          </p>
          <button
            onClick={testDatabaseColumn}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Database'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Results:</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap font-mono">
              {result}
            </pre>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">📋 What to look for:</h3>
          <ul className="list-disc list-inside space-y-2 text-yellow-700">
            <li>✅ Green checkmarks mean success</li>
            <li>❌ Red X marks indicate problems</li>
            <li>If "MRGroups" fails but another name works, update the code</li>
            <li>If all bucket names fail, create the MRGroups bucket in Supabase</li>
            <li>If database test fails, run the migration SQL</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
