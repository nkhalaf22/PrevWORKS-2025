import React, { useState, useEffect } from 'react';
import Papa from 'papaparse'; // Added PapaParse for CSV parsing
import { 
    Container, 
    Header, 
    SpaceBetween, 
    FormField, 
    FileUpload, 
    Button, 
    Alert,
    Box, 
    Input
} from '@cloudscape-design/components';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp
import { addProgramData } from '../lib/surveys'; // Import the function


/**
 * Converts a single parsed CSV row object into the ProgramData structure 
 * required by the addProgramData function.
 * @param {object} row A single parsed CSV row.
 * @param {string} pid The program_id provided by the user.
 * @returns {ProgramData | null} The structured data ready for Firestore, or null if mapping fails.
 */
const mapToProgramData = (row, pid) => {
    // Helper to safely convert a date string to a Firestore Timestamp
    const toTimestamp = (dateString) => {
        if (!dateString) return null
        const date = new Date(dateString)
        // Check for 'Invalid Date' before converting
        return date.toString() !== 'Invalid Date' ? Timestamp.fromDate(date) : null
    }

    // Helper to safely convert a string to a number
    const toNumber = (value) => Number(value) || 0

    const requiredFields = [
        'Start Date', 
        'End Date', 
        'Department', 
        'Respect For Patient Preferences',
        'Information and Education',
        'Access to Care',
        'Coordination of Care',
        'Emotional Support',
        'Sample Size' 
    ];

    const hasMissingField = requiredFields.some(field => !row[field]);
    
    if (hasMissingField || !pid) {
         console.warn("Skipping row due to missing critical data:", { row, programId: pid });
         return null;
    }

    
    return {
        program_id: pid,
        start_date: toTimestamp(row['Start Date']),
        end_date: toTimestamp(row['End Date']),
        department: row['Department'],
        respect_patient_prefs: toNumber(row['Respect For Patient Preferences']),
        information_education: toNumber(row['Information and Education']),
        access_care: toNumber(row['Access to Care']),
        coord_care: toNumber(row['Coordination of Care']),
        emotional_support: toNumber(row['Emotional Support']),
        sample_size: toNumber(row['Sample Size']),
    }
}


export default function CgCahpsDrivers({ programId: initialProgramId }) {
    // State to hold the selected file for Program data
    const [programFile, setProgramFile] = useState(null)
    // Use the prop as the initial value
    const [programId, setProgramId] = useState(initialProgramId || '') 
    
    // State for simple submission feedback/messages
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('info') 
    const [loading, setLoading] = useState(false) 

    // Update local state if the programId prop changes (i.e., when data loads)
    useEffect(() => {
        if (initialProgramId) {
            setProgramId(initialProgramId);
        }
    }, [initialProgramId]);


    /**
     * Handles the 'Submit' action: parses the file and sends data to Firestore.
     * @param {File | null} file The file object to be submitted.
     */
    const handleSubmit = (file) => {
        if (!file) {
            setMessage('Please select a file before submitting.')
            setMessageType('info')
            return
        }

        if (!programId) {
            setMessage('Program ID is missing. Please ensure your manager profile loaded correctly.')
            setMessageType('error')
            return
        }

        setLoading(true)
        setMessage('Parsing Program data...')
        setMessageType('info')
        
        // Client-side CSV Parsing using PapaParse -> 
        // In the future this can be moved to a Cloud Function if the CSV is uploaded to Cloud Storage
        Papa.parse(file, {
            header: true, // Converts the CSV to an array of objects
            skipEmptyLines: true,

            // Clean headers and values by trimming and removing newlines
            transformHeader: (header) => header.trim().replace(/\n/g, ''),
            transform: (value) => value.trim().replace(/\n/g, ''),
            
            complete: async (results) => {
                if (results.errors.length) {
                    const errorMsg = results.errors.map(e => e.message).join('; ')
                    console.error('Parsing errors:', results.errors)
                    setMessage(`Parsing failed: ${errorMsg}`)
                    setMessageType('error')
                    setLoading(false)
                    setTimeout(() => setMessage(''), 5000)
                    return
                }
                    
                const dataToSubmit = results.data
                    .map(row => mapToProgramData(row, programId))
                    .filter(data => data !== null) // Filter out any invalid rows
                    
                let successCount = 0
                let errorCount = 0
                    
                for (const data of dataToSubmit) {
                    try {
                        if (!data.start_date || !data.end_date || !data.program_id) {
                            throw new Error('Row contains invalid dates or Program ID.')
                        }
                        await addProgramData(data)
                        successCount++
                    } catch (e) {
                        console.error('Firestore submission error for row:', data, e)
                        errorCount++
                    }
                }

                if (successCount > 0) {
                    setMessage(`Success! Uploaded ${successCount} record(s). ${errorCount > 0 ? `(${errorCount} failed)` : ''}`)
                    setMessageType('success')
                    setProgramFile(null) // Clear the file field on success
                } else {
                    setMessage(`Submission failed. No valid records found to submit.`)
                    setMessageType('error')
                }
                
                setLoading(false)
                setTimeout(() => setMessage(''), 5000)
            },
            error: (error) => {
                console.error('PapaParse general error:', error)
                setMessage(`An unexpected error occurred during parsing: ${error.message}`)
                setMessageType('error')
                setLoading(false)
                setTimeout(() => setMessage(''), 5000)
            }
        });
    }

    // Submit button is enabled only if a file is selected and programId is present
    const canSubmit = programFile && programId && !loading

    return (
        <Container header={<Header variant="h2">CG-CAHPS Drivers Upload</Header>}>
            <SpaceBetween size="l">

                {/* Submission feedback message */}
                {message && (
                    <Alert type={messageType} onDismiss={() => setMessage('')}>
                        {message}
                    </Alert>
                )}

                {/* -------------------- PROGRAM TOP BOX DATA -------------------- */}
                <SpaceBetween size="s">
                    <Header variant="h3">Program Top Box Data</Header>

                    <FormField 
                        label="Upload CSV"
                        description="CSV must contain: Start Date, End Date, Department, 5 Driver Scores, and Number of Surveys."
                    >
                        <FileUpload
                            onChange={({ detail }) => {
                                setProgramFile(detail.value && detail.value[0]);
                            }}
                            value={programFile ? [programFile] : []}
                            showFileLastModified
                            showFileSize
                            accept=".csv"
                            multiple={false}
                            disabled={loading}
                        />
                    </FormField>
                    
                    <Button 
                        variant="primary" 
                        onClick={() => handleSubmit(programFile)}
                        disabled={!canSubmit}
                        loading={loading}
                    >
                        Submit Program Data
                    </Button>

                </SpaceBetween>
            </SpaceBetween>
        </Container>
    )
}
