import React, { useState, useEffect } from 'react';
import Papa from 'papaparse'; 
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
import { Timestamp } from 'firebase/firestore'; 
import { addProgramData, addNrcData } from '../lib/surveys'; 


const toTimestamp = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    // Check for 'Invalid Date' before converting
    return date.toString() !== 'Invalid Date' ? Timestamp.fromDate(date) : null
}

const toNumber = (value) => Number(value) || 0

/**
 * Converts a single parsed CSV row object into the ProgramData structure 
 * required by the addProgramData function.
 * @param {object} row A single parsed CSV row.
 * @param {string} pid The program_id provided by the user.
 * @returns {object | null} The structured data ready for Firestore, or null if mapping fails.
 */
const mapToProgramData = (row, pid) => {
    const requiredFields = [
        'Start Date', 'End Date', 'Department', 'Respect For Patient Preferences',
        'Information and Education', 'Access to Care', 'Coordination of Care',
        'Emotional Support', 'Sample Size' 
    ];

    const hasMissingField = requiredFields.some(field => !row[field]);
    
    if (hasMissingField || !pid) {
         console.warn("Skipping Program row due to missing critical data:", { row, programId: pid });
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


const mapToNrcData = (row, pid) => {
    const requiredFields = [
        'Start Date', 'End Date', 'Respect For Patient Preferences',
        'Information and Education', 'Access to Care', 
        'Coordination of Care', 'Emotional Support',
    ];

    const hasMissingField = requiredFields.some(field => !row[field]);
    
    if (hasMissingField || !pid) {
         console.warn("Skipping NRC row due to missing critical data:", { row, programId: pid });
         return null;
    }
    
    return {
        program_id: pid,
        start_date: toTimestamp(row['Start Date']),
        end_date: toTimestamp(row['End Date']),
        respect_patient_prefs: toNumber(row['Respect For Patient Preferences']),
        information_education: toNumber(row['Information and Education']),
        access_care: toNumber(row['Access to Care']),
        coord_care: toNumber(row['Coordination of Care']),
        emotional_support: toNumber(row['Emotional Support']),
    }
}

function ProgramUploadPanel({ programId, setMessage, setMessageType }) {
    const [programFile, setProgramFile] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleSubmitProgram = (file) => {
        if (!file) {
            setMessage('Please select a Program file before submitting.')
            setMessageType('info')
            return
        }

        if (!programId) {
            setMessage('Program ID is missing for Program submission.')
            setMessageType('error')
            return
        }

        setLoading(true)
        setMessage('Parsing Program data...')
        setMessageType('info')
        
        Papa.parse(file, {
            header: true, 
            skipEmptyLines: true,
            transformHeader: (header) => header.trim().replace(/\n/g, ''),
            transform: (value) => value.trim().replace(/\n/g, ''),
            
            complete: async (results) => {
                if (results.errors.length) {
                    const errorMsg = results.errors.map(e => e.message).join('; ')
                    console.error('Program Parsing errors:', results.errors)
                    setMessage(`Program Parsing failed: ${errorMsg}`)
                    setMessageType('error')
                    setLoading(false)
                    setTimeout(() => setMessage(''), 5000)
                    return
                }
                    
                const dataToSubmit = results.data
                    .map(row => mapToProgramData(row, programId))
                    .filter(data => data !== null)
                    
                let successCount = 0
                let errorCount = 0
                    
                for (const data of dataToSubmit) {
                    try {
                        if (!data.start_date || !data.end_date || !data.program_id) {
                            throw new Error('Program Row contains invalid dates or Program ID.')
                        }
                        await addProgramData(data)
                        successCount++
                    } catch (e) {
                        console.error('Firestore submission error for Program row:', data, e)
                        errorCount++
                    }
                }

                if (successCount > 0) {
                    setMessage(`Success! Uploaded ${successCount} Program record(s). ${errorCount > 0 ? `(${errorCount} failed)` : ''}`)
                    setMessageType('success')
                    setProgramFile(null) 
                } else {
                    setMessage(`Program Submission failed. No valid records found to submit.`)
                    setMessageType('error')
                }
                
                setLoading(false)
                setTimeout(() => setMessage(''), 5000)
            },
            error: (error) => {
                console.error('PapaParse general error for Program:', error)
                setMessage(`An unexpected error occurred during Program parsing: ${error.message}`)
                setMessageType('error')
                setLoading(false)
                setTimeout(() => setMessage(''), 5000)
            }
        });
    }

    const canSubmit = programFile && programId && !loading

    return (
        <SpaceBetween size="s">
            <SpaceBetween direction="horizontal" size="m" alignItems="center">
                <Header variant="h3">Program Top Box Data</Header>
                <Button 
                    variant="link" 
                    disabled={loading}
                    href='/src/templates/programdatasample.csv'
                    download 
                >
                    Download Template
                </Button>
            </SpaceBetween>

            <FormField 
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
                onClick={() => handleSubmitProgram(programFile)}
                disabled={!canSubmit}
                loading={loading}
            >
                Submit Program Data
            </Button>
        </SpaceBetween>
    )
}

function NrcUploadPanel({ programId, setMessage, setMessageType }) {
    const [nrcFile, setNrcFile] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleSubmitNrc = (file) => {
        if (!file) {
            setMessage('Please select an NRC file before submitting.')
            setMessageType('info')
            return
        }

        if (!programId) {
            setMessage('Program ID is missing for NRC submission.')
            setMessageType('error')
            return
        }

        setLoading(true)
        setMessage('Parsing NRC data...')
        setMessageType('info')
        
        Papa.parse(file, {
            header: true, 
            skipEmptyLines: true,
            transformHeader: (header) => header.trim().replace(/\n/g, ''),
            transform: (value) => value.trim().replace(/\n/g, ''),
            
            complete: async (results) => {
                if (results.errors.length) {
                    const errorMsg = results.errors.map(e => e.message).join('; ')
                    console.error('NRC Parsing errors:', results.errors)
                    setMessage(`NRC Parsing failed: ${errorMsg}`)
                    setMessageType('error')
                    setLoading(false)
                    setTimeout(() => setMessage(''), 5000)
                    return
                }
                    
                const dataToSubmit = results.data
                    .map(row => mapToNrcData(row, programId))
                    .filter(data => data !== null)
                    
                let successCount = 0
                let errorCount = 0
                    
                for (const data of dataToSubmit) {
                    try {
                        if (!data.start_date || !data.end_date || !data.program_id) {
                            throw new Error('NRC Row contains invalid dates or Program ID.')
                        }
                        await addNrcData(data) 
                        successCount++
                    } catch (e) {
                        console.error('Firestore submission error for NRC row:', data, e)
                        errorCount++
                    }
                }

                if (successCount > 0) {
                    setMessage(`Success! Uploaded ${successCount} NRC record(s). ${errorCount > 0 ? `(${errorCount} failed)` : ''}`)
                    setMessageType('success')
                    setNrcFile(null) 
                } else {
                    setMessage(`NRC Submission failed. No valid records found to submit.`)
                    setMessageType('error')
                }
                
                setLoading(false)
                setTimeout(() => setMessage(''), 5000)
            },
            error: (error) => {
                console.error('PapaParse general error for NRC:', error)
                setMessage(`An unexpected error occurred during NRC parsing: ${error.message}`)
                setMessageType('error')
                setLoading(false)
                setTimeout(() => setMessage(''), 5000)
            }
        });
    }

    const canSubmitNrc = nrcFile && programId && !loading

    return (
        <SpaceBetween size="s">
            <SpaceBetween direction="horizontal" size="m" alignItems="center">
                <Header variant="h3">NRC Average Score Data</Header>
                <Button 
                    variant="link" 
                    disabled={loading}
                    href='/src/templates/nrcavgsample.csv'
                    download 
                >
                    Download Template
                </Button>
            </SpaceBetween>
            
            <FormField 
                label="Upload CSV"
            >
                <FileUpload
                    onChange={({ detail }) => setNrcFile(detail.value && detail.value[0])}
                    value={nrcFile ? [nrcFile] : []}
                    showFileLastModified
                    showFileSize
                    accept=".csv"
                    multiple={false}
                    disabled={loading}
                />
            </FormField>
            
            <Button 
                variant="primary" 
                onClick={() => handleSubmitNrc(nrcFile)}
                disabled={!canSubmitNrc}
                loading={loading}
            >
                Submit NRC Data
            </Button>
        </SpaceBetween>
    )
}


export default function CgCahpsDrivers({ programId: initialProgramId }) {
    const [programId, setProgramId] = useState(initialProgramId || '') 
        const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('info') 
    
    useEffect(() => {
        if (initialProgramId) {
            setProgramId(initialProgramId);
        }
    }, [initialProgramId]);

    const programIdDisplay = programId 
        ? <Box variant="span" color="text-status-success">{programId}</Box>
        : <Box variant="span" color="text-status-error">Missing</Box>


    return (
        <Container header={<Header variant="h2">CG-CAHPS Drivers Upload</Header>}>
            <SpaceBetween size="l">
                {message && (
                    <Alert type={messageType} onDismiss={() => setMessage('')}>
                        {message}
                    </Alert>
                )}

                <ProgramUploadPanel 
                    programId={programId} 
                    setMessage={setMessage}
                    setMessageType={setMessageType}
                />
                
                <hr />

                <NrcUploadPanel 
                    programId={programId} 
                    setMessage={setMessage}
                    setMessageType={setMessageType}
                />

            </SpaceBetween>
        </Container>
    )
}
