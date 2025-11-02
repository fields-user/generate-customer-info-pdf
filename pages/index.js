import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

export default function Home() {
  const [customerId, setCustomerId] = useState('');
  const [files, setFiles] = useState([]);
  const [pdfUrl, setPdfUrl] = useState('');
  const [zipUrl, setZipUrl] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generationType, setGenerationType] = useState('pdf'); // 'pdf' or 'zip'

  const onDrop = (acceptedFiles, rejectedFiles) => {
    // Validate image format more strictly
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
    const validFiles = acceptedFiles.filter(file => validImageTypes.includes(file.type));
    
    // Handle duplicate names by adding increment index
    const processedFiles = validFiles.map(newFile => {
      const existingNames = files.map(f => f.name);
      let fileName = newFile.name;
      let counter = 1;
      
      // Check if file name already exists
      while (existingNames.includes(fileName)) {
        const nameWithoutExt = newFile.name.replace(/\.[^/.]+$/, "");
        const extension = newFile.name.match(/\.[^/.]+$/)?.[0] || "";
        fileName = `${nameWithoutExt}_${counter}${extension}`;
        counter++;
      }
      
      // Create a new file object with the updated name
      return new File([newFile], fileName, { type: newFile.type });
    });
    
    setFiles(prev => [...prev, ...processedFiles]);
    
    // Clear error message when files are successfully uploaded
    setErrorMessage('');
    
    // Show feedback for uploaded and rejected files
    const duplicateCount = processedFiles.filter(file => file.name !== validFiles.find(vf => vf.size === file.size)?.name).length;
    const rejectedCount = acceptedFiles.length - validFiles.length + rejectedFiles.length;
    
    let message = '';
    if (processedFiles.length > 0) {
      message += `✅ ${processedFiles.length} image(s) uploaded successfully.`;
      if (duplicateCount > 0) {
        message += ` ${duplicateCount} file(s) were renamed to avoid duplicates.`;
      }
    }
    if (rejectedCount > 0) {
      message += ` ❌ ${rejectedCount} file(s) rejected (only JPEG, PNG, GIF, WebP, SVG, BMP allowed).`;
    }
    
    setUploadMessage(message);
    
    // Clear message after 5 seconds
    setTimeout(() => setUploadMessage(''), 5000);
  };

  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop, 
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/svg+xml': ['.svg'],
      'image/bmp': ['.bmp']
    }, 
    multiple: true 
  });

  // Clear all data when page loads or reloads
  useEffect(() => {
    setCustomerId('');
    setFiles([]);
    setPdfUrl('');
    setZipUrl('');
    setUploadMessage('');
    setErrorMessage('');
  }, []);

  const resetForm = () => {
    setCustomerId('');
    setFiles([]);
    setPdfUrl('');
    setZipUrl('');
    setUploadMessage('');
    setErrorMessage('');
  };

  const generatePDF = async () => {
    // Clear any previous error messages first
    setErrorMessage('');
    
    // Validate Customer Identification No
    const trimmedCustomerId = customerId.trim();
    if (!trimmedCustomerId) {
      setErrorMessage('Must provide Customer Identification No');
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    
    // Validate that at least one image is uploaded
    if (files.length === 0) {
      setErrorMessage('Must uploaded at least one image');
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    
    const doc = new jsPDF();
    
    // Process images sequentially to maintain order
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      
      // Add a new page for each image except the first one
      if (index > 0) {
        doc.addPage();
      }
      
      // Read file as data URL and wait for it to complete
      const imgData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
      
      // Determine image format from file type
      let imageFormat = 'JPEG';
      if (file.type === 'image/png') imageFormat = 'PNG';
      else if (file.type === 'image/jpeg' || file.type === 'image/jpg') imageFormat = 'JPEG';
      else if (file.type === 'image/gif') imageFormat = 'GIF';
      else if (file.type === 'image/webp') imageFormat = 'WEBP';
      else if (file.type === 'image/bmp') imageFormat = 'BMP';
      // SVG might need special handling, defaulting to JPEG for now
      
      // Get page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Calculate image dimensions to fit the page with margins
      const margin = 10;
      const maxWidth = pageWidth - (2 * margin);
      const maxHeight = pageHeight - (2 * margin);
      
      // Create an image element to get actual dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgData;
      });
      
      // Calculate scaling to fit within page bounds
      const imgAspectRatio = img.width / img.height;
      let imgWidth = maxWidth;
      let imgHeight = maxWidth / imgAspectRatio;
      
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = maxHeight * imgAspectRatio;
      }
      
      // Add image to PDF at calculated position and size
      doc.addImage(imgData, imageFormat, margin, margin, imgWidth, imgHeight);
    }
    
    // Generate PDF after all images are added
    const filename = `${trimmedCustomerId}_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    setPdfUrl(url);
    setZipUrl(''); // Clear ZIP URL when generating PDF
  };

  const generateZip = async () => {
    // Clear any previous error messages first
    setErrorMessage('');
    
    // Validate Customer Identification No
    const trimmedCustomerId = customerId.trim();
    if (!trimmedCustomerId) {
      setErrorMessage('Must provide Customer Identification No');
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    
    // Validate that at least one image is uploaded
    if (files.length === 0) {
      setErrorMessage('Must uploaded at least one image');
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    
    const zip = new JSZip();
    
    // Add all images to the ZIP file
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const arrayBuffer = await file.arrayBuffer();
      zip.file(file.name, arrayBuffer);
    }
    
    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    setZipUrl(url);
    setPdfUrl(''); // Clear PDF URL when generating ZIP
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f0f8ff' }}>
      <h1 style={{ color: '#333' }}>Customer PDF Generator</h1>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="customerId" style={{ marginRight: '10px', fontWeight: 'bold' }}>Customer Identification No:</label>
        <input
          type="text"
          id="customerId"
          value={customerId}
          onChange={e => {
            setCustomerId(e.target.value);
            // Clear error message when user starts typing
            if (errorMessage && errorMessage.includes('Customer Identification No')) {
              setErrorMessage('');
            }
          }}
          style={{ padding: '5px', width: '300px' }}
        />
      </div>
      <div {...getRootProps()} style={{ border: '2px dashed #888', padding: '20px', backgroundColor: '#fff0f5', cursor: 'pointer' }}>
        <input {...getInputProps()} />
        <p>Drag & Drop images here, or click to select files</p>
        <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
          Supported formats: JPEG, PNG, GIF, WebP, SVG, BMP
        </p>
      </div>
      
      {/* Upload message */}
      {uploadMessage && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: uploadMessage.includes('❌') ? '#ffebee' : '#e8f5e8', 
          border: `1px solid ${uploadMessage.includes('❌') ? '#ffcdd2' : '#c8e6c8'}`, 
          borderRadius: '5px',
          color: uploadMessage.includes('❌') ? '#c62828' : '#2e7d32'
        }}>
          {uploadMessage}
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #ffcdd2', 
          borderRadius: '5px',
          color: '#c62828'
        }}>
          {errorMessage}
        </div>
      )}
      
      {/* Display uploaded images information */}
      {files.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Uploaded Images Information</h3>
          <p style={{ margin: '5px 0', fontWeight: 'bold' }}>Total Images: {files.length}</p>
          <div style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
            <p style={{ margin: '5px 0', fontWeight: 'bold' }}>File Names:</p>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              {files.map((file, index) => (
                <li key={index} style={{ margin: '2px 0' }}>{file.name}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Radio buttons for selection */}
      <div style={{ marginTop: '20px', marginBottom: '15px' }}>
        <label style={{ marginRight: '20px', cursor: 'pointer' }}>
          <input
            type="radio"
            value="pdf"
            checked={generationType === 'pdf'}
            onChange={(e) => {
              setGenerationType(e.target.value);
              setPdfUrl('');
              setZipUrl('');
            }}
            style={{ marginRight: '5px', cursor: 'pointer' }}
          />
          Generate PDF
        </label>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="radio"
            value="zip"
            checked={generationType === 'zip'}
            onChange={(e) => {
              setGenerationType(e.target.value);
              setPdfUrl('');
              setZipUrl('');
            }}
            style={{ marginRight: '5px', cursor: 'pointer' }}
          />
          Generate ZIP File
        </label>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={generationType === 'pdf' ? generatePDF : generateZip} 
          style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', marginRight: '10px', borderRadius: '5px', cursor: 'pointer' }}
        >
          {generationType === 'pdf' ? 'Generate PDF' : 'Generate Zip File'}
        </button>
        <button onClick={resetForm} style={{ padding: '10px 20px', backgroundColor: 'white', color: '#333', border: '2px solid #ddd', borderRadius: '5px', cursor: 'pointer' }}>
          Reset
        </button>
      </div>
      {pdfUrl && (
        <div style={{ marginTop: '20px' }}>
          <a href={pdfUrl} download={`${customerId}_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`} style={{ color: '#0000EE' }}>
            Download PDF
          </a>
        </div>
      )}
      {zipUrl && (
        <div style={{ marginTop: '20px' }}>
          <a href={zipUrl} download={`${customerId}_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`} style={{ color: '#0000EE' }}>
            Download Zip File
          </a>
        </div>
      )}
    </div>
  );
}
