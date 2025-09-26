import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import jsPDF from 'jspdf';

export default function Home() {
  const [customerId, setCustomerId] = useState('');
  const [files, setFiles] = useState([]);
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

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
    setUploadMessage('');
  }, []);

  const resetForm = () => {
    setCustomerId('');
    setFiles([]);
    setPdfUrl('');
    setUploadMessage('');
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    let count = 0;

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const imgData = e.target.result;
        if (index > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 10, 10, 180, 160);
        count++;
        if (count === files.length) {
          const filename = `${customerId}_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
          const pdfBlob = doc.output('blob');
          const url = URL.createObjectURL(pdfBlob);
          setPdfUrl(url);
        }
      };
      reader.readAsDataURL(file);
    });
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
          onChange={e => setCustomerId(e.target.value)}
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
      
      <div style={{ marginTop: '20px' }}>
        <button onClick={generatePDF} style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', marginRight: '10px', borderRadius: '5px', cursor: 'pointer' }}>
          Generate PDF
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
    </div>
  );
}
