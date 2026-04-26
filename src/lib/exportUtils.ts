// Export utility functions for Collections and Workers

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  // Get headers from the first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        }
        // Handle strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value || ''
      }).join(',')
    )
  ].join('\n')

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportToPDF = (data: any[], filename: string, title: string) => {
  // Simple PDF export using window.print()
  // In a real application, you would use a library like jsPDF or Puppeteer
  
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Unable to open print window. Please check your popup blocker.')
    return
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .header { text-align: center; margin-bottom: 20px; }
        .date { color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
      </div>
      <table>
        <thead>
          <tr>
            ${Object.keys(data[0] || {}).map(key => `<th>${key.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => 
            `<tr>${Object.values(row).map(value => 
              `<td>${typeof value === 'object' ? JSON.stringify(value) : value || ''}</td>`
            ).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()
  printWindow.print()
}

export const exportCollections = (collections: any[]) => {
  const exportData = collections.map(collection => ({
    'Collection ID': collection.id,
    'Customer Name': collection.customer?.name || 'N/A',
    'Customer Phone': collection.customer?.phone || 'N/A',
    'Loan Amount': collection.loan?.amount || 0,
    'Amount Collected': collection.amount_collected,
    'Remaining Balance': collection.remaining_balance,
    'Collection Date': collection.collection_date,
    'Worker': collection.worker?.name || 'Unassigned',
    'Status': collection.status
  }))
  
  exportToCSV(exportData, 'collections')
}

export const exportWorkers = (workers: any[], loans: any[], customers: any[]) => {
  const exportData = workers.map(worker => {
    const workerLoans = loans.filter(loan => loan.team_leader_id === worker.id)
    const workerCustomers = customers.filter(customer => 
      workerLoans.some(loan => loan.customer_id === customer.id)
    )
    const totalLoanAmount = workerLoans.reduce((sum, loan) => sum + loan.amount, 0)
    
    return {
      'Employee ID': worker.id,
      'Employee Name': worker.name,
      'Email': worker.email,
      'Phone': worker.phone,
      'Designation': worker.designation,
      'Department': worker.department,
      'Customers Handled': workerCustomers.length,
      'Total Loan Amount': totalLoanAmount,
      'Created Date': worker.created_at
    }
  })
  
  exportToCSV(exportData, 'workers')
}

export const exportLoans = (loans: any[]) => {
  const exportData = loans.map(loan => ({
    'Loan ID': loan.id,
    'Customer ID': loan.customer_id,
    'Customer Name': loan.customer?.name || 'N/A',
    'Customer Phone': loan.customer?.phone || 'N/A',
    'Loan Amount': loan.amount,
    'Status': loan.status,
    'Start Date': loan.start_date,
    'End Date': loan.end_date,
    'Interest Rate': loan.interest_rate,
    'Number of Weeks': loan.number_of_weeks,
    'Team Leader': loan.team_leader?.name || 'Unassigned',
    'Weekly Batch': loan.weekly_batch || 'N/A',
    'Loan Purpose': loan.loan_purpose || 'N/A',
    'Bank Name': loan.customer_bank_name || 'N/A',
    'Account Number': loan.account_number || 'N/A',
    'IFSC Code': loan.ifsc_code || 'N/A',
    'Created Date': loan.created_at
  }))
  
  exportToCSV(exportData, 'loans')
}

export const exportCustomers = (customers: any[]) => {
  const exportData = customers.map(customer => ({
    'Customer ID': customer.id,
    'Customer Name': customer.name,
    'Phone': customer.phone,
    'Address': customer.address,
    'Relationship': customer.relationship || 'N/A',
    'Aadhaar Number': customer.aadhaar_number || 'N/A',
    'PAN Number': customer.pan_number || 'N/A',
    'Additional Mobile 1': customer.additional_mobile_1 || 'N/A',
    'Additional Mobile 1 Relationship': customer.additional_mobile_1_relationship || 'N/A',
    'Additional Mobile 2': customer.additional_mobile_2 || 'N/A',
    'Additional Mobile 2 Relationship': customer.additional_mobile_2_relationship || 'N/A',
    'Created Date': customer.created_at
  }))
  
  exportToCSV(exportData, 'customers')
}

export const exportDashboardStats = (stats: any, loans: any[], employees: any[], customers: any[]) => {
  const exportData = [
    {
      'Metric': 'New Loans (Last 30 days)',
      'Value': stats.newLoans,
      'Description': 'Number of new loans created in the last 30 days'
    },
    {
      'Metric': 'Active Loans',
      'Value': stats.activeLoans,
      'Description': 'Currently active loans'
    },
    {
      'Metric': 'Closed Loans',
      'Value': stats.closedLoans,
      'Description': 'Completed/closed loans'
    },
    {
      'Metric': 'Open Loan Applications',
      'Value': stats.openLoanApplications,
      'Description': 'Pending loan applications'
    },
    {
      'Metric': 'New Loan Applications (Last 7 days)',
      'Value': stats.newLoanApplications,
      'Description': 'New applications in the last 7 days'
    },
    {
      'Metric': 'Total Sanctioned Amount',
      'Value': stats.totalSanctionedAmount,
      'Description': 'Total amount sanctioned across all loans'
    },
    {
      'Metric': 'Total Repayment',
      'Value': stats.totalRepayment,
      'Description': 'Total amount repaid'
    },
    {
      'Metric': 'Total Disbursed',
      'Value': stats.totalDisbursed,
      'Description': 'Total amount disbursed'
    },
    {
      'Metric': 'Active Securities',
      'Value': stats.activeSecurities,
      'Description': 'Number of active securities'
    },
    {
      'Metric': 'Total Customers',
      'Value': customers.length,
      'Description': 'Total number of customers'
    },
    {
      'Metric': 'Total Employees',
      'Value': employees.length,
      'Description': 'Total number of employees'
    },
    {
      'Metric': 'Total Loans',
      'Value': loans.length,
      'Description': 'Total number of loans'
    }
  ]
  
  exportToCSV(exportData, 'dashboard-statistics')
}

export const exportWeeklyBatches = (weeklyBatches: any[], loans: any[]) => {
  const exportData = weeklyBatches.map(batch => {
    const batchLoans = loans.filter(loan => loan.weekly_batch === batch.day)
    const totalAmount = batchLoans.reduce((sum, loan) => sum + loan.amount, 0)
    
    return {
      'Batch ID': batch.id,
      'Batch Name': batch.name,
      'Day': batch.day,
      'Total Collection': batch.total_collection,
      'Customer Count': batch.customer_count,
      'Target Amount': batch.target_amount,
      'Completion Percentage': `${batch.completion_percentage.toFixed(1)}%`,
      'Last Collection Date': batch.last_collection_date || 'N/A',
      'Next Collection Date': batch.next_collection_date,
      'Status': batch.status,
      'Total Loan Amount': totalAmount,
      'Actual Customer Count': batchLoans.length
    }
  })
  
  exportToCSV(exportData, 'weekly-batches')
}

export const exportBatchDetails = (batch: any, loans: any[]) => {
  const batchLoans = loans.filter(loan => loan.weekly_batch === batch.day)
  
  const exportData = batchLoans.map(loan => {
    // Calculate EMI using new formula: EMI = (Interest Rate × Loan Amount) / 100
    const interestRate = parseFloat(loan.interest_rate || '8.33')
    const loanAmount = Number(loan.amount) || 0
    const emi = (interestRate * loanAmount) / 100
    const totalAmount = emi * (loan.number_of_weeks || 15)
    const weeklyEMI = emi
    
    return {
      'Customer ID': loan.customer_id,
      'Customer Name': loan.customer?.name || 'N/A',
      'Customer Phone': loan.customer?.phone || 'N/A',
      'Worker': loan.team_leader?.name || 'Unassigned',
      'Loan Amount': loan.amount,
      'Tenure (Weeks)': loan.number_of_weeks || 15,
      'Interest Rate': `${interestRate}%`,
      'Weekly EMI': weeklyEMI,
      'Total Amount': totalAmount,
      'Start Date': loan.start_date,
      'End Date': loan.end_date,
      'Status': loan.status,
      'Weekly Batch': loan.weekly_batch
    }
  })
  
  exportToCSV(exportData, `${batch.name.toLowerCase().replace(/\s+/g, '-')}-details`)
}