'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPhotoUpload() {
  const [status, setStatus] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [testImage, setTestImage] = useState<File | null>(null)

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
    console.log(msg)
  }

  const createTestImage = () => {
    // Create a tiny 1x1 pixel PNG image
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#FF0000'
      ctx.fillRect(0, 0, 1, 1)
    }
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'test-image.png', { type: 'image/png' })
        setTestImage(file)
        addLog(`✅ Created test image: ${(file.size / 1024).toFixed(2)} KB`)
      }
    }, 'image/png')
  }

  const testBucketConnection = async () => {
    setStatus('Testing...')
    setLogs([])
    addLog('🚀 Starting bucket connection test...')
    
    try {
      // Step 1: Check if bucket exists
      addLog('📦 Checking if MRGroups bucket exists...')
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
      
      if (bucketError) {
        addLog(`❌ Error listing buckets: ${bucketError.message}`)
        setStatus('Failed - Check console')
        return
      }
      
      const mrGroupsBucket = buckets?.find(b => b.name === 'MRGroups')
      
      if (!mrGroupsBucket) {
        addLog('❌ MRGroups bucket NOT found!')
        addLog('📝 Available buckets: ' + buckets?.map(b => b.name).join(', ') || 'none')
        setStatus('FAILED - Bucket does not exist')
        alert('❌ MRGroups bucket does not exist!\n\nPlease create it in Supabase Dashboard:\n1. Go to Storage\n2. Click "New bucket"\n3. Name it exactly: MRGroups\n4. Set Public = true\n5. Click "Create bucket"')
        return
      }
      
      addLog(`✅ Found MRGroups bucket! (ID: ${mrGroupsBucket.id})`)
      addLog(`📊 Bucket details: Public=${mrGroupsBucket.public}, Created=${new Date(mrGroupsBucket.created_at).toLocaleString()}`)
      
      // Step 2: Try uploading a test file
      if (!testImage) {
        addLog('⚠️ No test image available. Click "Create Test Image" first.')
        setStatus('Need test image')
        return
      }
      
      addLog('📤 Uploading test file...')
      const fileName = `test-uploads/${Date.now()}_test.png`
      addLog(`📁 File name: ${fileName}`)
      addLog(`📊 File size: ${(testImage.size / 1024).toFixed(2)} KB`)
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('MRGroups')
        .upload(fileName, testImage, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        addLog(`❌ Upload failed: ${uploadError.message}`)
        addLog(`📋 Error details: ${JSON.stringify(uploadError, null, 2)}`)
        
        if (uploadError.message.includes('row-level security')) {
          addLog('🔒 RLS POLICY ERROR! Run this SQL in Supabase:')
          addLog('See: STORAGE_RLS_FIX_GUIDE.md for the SQL script')
          alert('❌ RLS Policy Error!\n\nYou need to run the SQL script to fix permissions.\n\nCheck: STORAGE_RLS_FIX_GUIDE.md')
        }
        
        setStatus('FAILED - Upload error')
        return
      }
      
      addLog('✅ Upload successful!')
      addLog(`📍 Upload path: ${uploadData.path}`)
      
      // Step 3: Get public URL
      addLog('🔗 Getting public URL...')
      const { data: urlData } = supabase.storage
        .from('MRGroups')
        .getPublicUrl(fileName)
      
      addLog(`✅ Public URL: ${urlData.publicUrl}`)
      
      // Step 4: Verify URL is accessible
      addLog('🔍 Testing URL accessibility...')
      const response = await fetch(urlData.publicUrl)
      if (response.ok) {
        addLog('✅ URL is accessible!')
      } else {
        addLog(`⚠️ URL returned status: ${response.status}`)
      }
      
      // Step 5: Cleanup - delete test file
      addLog('🗑️ Cleaning up test file...')
      const { error: deleteError } = await supabase.storage
        .from('MRGroups')
        .remove([fileName])
      
      if (deleteError) {
        addLog(`⚠️ Warning: Could not delete test file: ${deleteError.message}`)
      } else {
        addLog('✅ Test file deleted successfully')
      }
      
      setStatus('SUCCESS! Photo uploads are working! ✅')
      addLog('🎉 All tests passed! Your photo upload feature should work.')
      
      alert('✅ SUCCESS!\n\nPhoto uploads are working correctly.\n\nYou can now use the photo upload feature in your loan application.')
      
    } catch (error: any) {
      addLog(`❌ Unexpected error: ${error.message}`)
      setStatus('ERROR - Check logs')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Photo Upload Diagnostic Test
        </h1>
        
        <p className="text-gray-600 mb-6">
          This page tests the MRGroups bucket connection and photo upload functionality.
        </p>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Steps</h2>
          
          <div className="space-y-4">
            <button
              onClick={createTestImage}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              1. Create Test Image
            </button>
            
            {testImage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  ✅ Test image ready: {(testImage.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}
            
            <button
              onClick={testBucketConnection}
              disabled={!testImage}
              className={`px-4 py-2 rounded font-medium ${
                !testImage 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              2. Test Bucket Connection
            </button>
          </div>

          {/* Status */}
          {status && (
            <div className={`mt-4 p-4 rounded-lg ${
              status.includes('SUCCESS') 
                ? 'bg-green-50 border-2 border-green-500' 
                : status.includes('FAILED') 
                ? 'bg-red-50 border-2 border-red-500'
                : 'bg-blue-50 border-2 border-blue-500'
            }`}>
              <p className={`font-semibold ${
                status.includes('SUCCESS') 
                  ? 'text-green-800' 
                  : status.includes('FAILED') 
                  ? 'text-red-800'
                  : 'text-blue-800'
              }`}>
                Status: {status}
              </p>
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Detailed Logs</h2>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click the buttons above to start testing.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
          
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear logs
            </button>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting Guide</h3>
          
          <div className="space-y-2 text-sm text-yellow-700">
            <p><strong>If bucket doesn't exist:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Go to Supabase Dashboard → Storage</li>
              <li>Click "New bucket"</li>
              <li>Name it exactly: <code className="bg-white px-2 py-1 rounded">MRGroups</code></li>
              <li>Set Public = true</li>
              <li>Click "Create bucket"</li>
            </ul>
            
            <p className="mt-3"><strong>If you get RLS policy error:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Run the SQL script from <code className="bg-white px-2 py-1 rounded">STORAGE_RLS_FIX_GUIDE.md</code></li>
              <li>Or see detailed instructions in <code className="bg-white px-2 py-1 rounded">MRGROUPS_BUCKET_CONNECTION_FIX.md</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
