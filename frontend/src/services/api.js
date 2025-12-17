import axiosInstance from '../utils/axiosConfig';

export const fetchAlertRecords = async () => {
  try {
    const response = await axiosInstance.get('/alerts');
    return response.data;
  } catch (error) {
    console.error('Error fetching alert records:', error);
    throw error;
  }
};

export const fetchAlertRecordsByEmployee = async (employeeId) => {
  try {
    const response = await axiosInstance.get(`/alerts/employee/${employeeId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching alert records for employee ${employeeId}:`, error);
    throw error;
  }
};

export const fetchConsecutiveWorkDays = async () => {
  try {
    const response = await axiosInstance.get('/consecutive-days');
    return response.data;
  } catch (error) {
    console.error('Error fetching consecutive work days:', error);
    throw error;
  }
};

export const fetchConsecutiveWorkDaysByEmployee = async (employeeId) => {
  try {
    const response = await axiosInstance.get(`/consecutive-days/employee/${employeeId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching consecutive work days for employee ${employeeId}:`, error);
    throw error;
  }
};

export const fetchAccessRecordsByEmployee = async (employeeId) => {
  try {
    const response = await axiosInstance.get(`/access-records/employee/${employeeId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching access records for employee ${employeeId}:`, error);
    throw error;
  }
};

// 缺勤记录相关API
export const fetchAbsenceRecords = async () => {
  try {
    const response = await axiosInstance.get('/absence-records');
    return response.data;
  } catch (error) {
    console.error('Error fetching absence records:', error);
    throw error;
  }
};

export const submitAbsenceReason = async (recordId, reasonData) => {
  try {
    const response = await axiosInstance.post(`/absence-records/${recordId}/reason`, reasonData);
    return response.data;
  } catch (error) {
    console.error(`Error submitting absence reason for record ${recordId}:`, error);
    throw error;
  }
};

export const updateAbsenceFlag = async (recordId, flagValue) => {
  try {
    const response = await axiosInstance.put(`/absence-records/${recordId}/flag`, { flag: flagValue });
    return response.data;
  } catch (error) {
    console.error(`Error updating absence flag for record ${recordId}:`, error);
    throw error;
  }
};

// 加班记录相关API
export const fetchOvertimeRecords = async () => {
  try {
    const response = await axiosInstance.get('/overtime-records');
    return response.data;
  } catch (error) {
    console.error('Error fetching overtime records:', error);
    throw error;
  }
};

// 分页查询加班记录
export const fetchOvertimeRecordsByPage = async (page = 1, pageSize = 10, search = '') => {
  try {
    const response = await axiosInstance.get('/overtime-records/page', {
      params: { page, pageSize, search }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching overtime records by page:', error);
    throw error;
  }
};

// 异常工时指标相关API
export const fetchExceptionalHoursIndicators = async () => {
  try {
    const response = await axiosInstance.get('/exceptional-hours/indicators');
    return response.data;
  } catch (error) {
    console.error('Error fetching exceptional hours indicators:', error);
    throw error;
  }
};

// 异常工时记录相关API
export const fetchExceptionalHoursRecords = async () => {
  try {
    const response = await axiosInstance.get('/exceptional-hours/records');
    return response.data;
  } catch (error) {
    console.error('Error fetching exceptional hours records:', error);
    throw error;
  }
};

// 分页查询异常工时记录
export const fetchExceptionalHoursRecordsByPage = async (page = 1, pageSize = 10, search = '') => {
  try {
    const response = await axiosInstance.get('/exceptional-hours/records/page', {
      params: { page, pageSize, search }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching exceptional hours records by page:', error);
    throw error;
  }
};

export const fetchExceptionalHoursRecordsByStatus = async (status) => {
  try {
    const response = await axiosInstance.get(`/exceptional-hours/records/status/${status}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching exceptional hours records by status ${status}:`, error);
    throw error;
  }
};

export const submitExceptionalHoursReason = async (recordId, reasonData) => {
  try {
    const response = await axiosInstance.post(`/exceptional-hours/records/${recordId}/reason`, reasonData);
    return response.data;
  } catch (error) {
    console.error(`Error submitting exceptional hours reason for record ${recordId}:`, error);
    throw error;
  }
};

export const approveExceptionalHoursRecord = async (recordId, approvedBy) => {
  try {
    const response = await axiosInstance.put(`/exceptional-hours/records/${recordId}/approve?approvedBy=${approvedBy}`);
    return response.data;
  } catch (error) {
    console.error(`Error approving exceptional hours record ${recordId}:`, error);
    throw error;
  }
};

// 组织相关API
export const fetchOrganizations = async () => {
  try {
    const response = await axiosInstance.get('/organizations');
    return response.data;
  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }
};

export const fetchActiveOrganizations = async () => {
  try {
    const response = await axiosInstance.get('/organizations/active');
    return response.data;
  } catch (error) {
    console.error('Error fetching active organizations:', error);
    throw error;
  }
};

export const fetchOrganizationSummary = async () => {
  try {
    const response = await axiosInstance.get('/organizations/summary');
    return response.data;
  } catch (error) {
    console.error('Error fetching organization summary:', error);
    throw error;
  }
};

// 请假记录相关API
export const fetchLeaveRecords = async () => {
  try {
    const response = await axiosInstance.get('/leave-records');
    return response.data;
  } catch (error) {
    console.error('Error fetching leave records:', error);
    throw error;
  }
};

// 分页查询请假记录
export const fetchLeaveRecordsByPage = async (page = 1, pageSize = 10, search = '') => {
  try {
    const response = await axiosInstance.get('/leave-records/page', {
      params: { page, pageSize, search }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching leave records by page:', error);
    throw error;
  }
};

export const fetchLeaveRecordsByEmployee = async (employeeId) => {
  try {
    const response = await axiosInstance.get(`/leave-records/employee/${employeeId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching leave records for employee ${employeeId}:`, error);
    throw error;
  }
};

export const fetchDeptLeaveSummary = async () => {
  try {
    const response = await axiosInstance.get('/leave-records/summary/dept');
    return response.data;
  } catch (error) {
    console.error('Error fetching department leave summary:', error);
    throw error;
  }
};

export const fetchDeptNetOvertimeSummary = async () => {
  try {
    const response = await axiosInstance.get('/leave-records/summary/net-overtime');
    return response.data;
  } catch (error) {
    console.error('Error fetching department net overtime summary:', error);
    throw error;
  }
};

// 自然语言查询相关API
export const executeNaturalLanguageQuery = async (query) => {
  try {
    const response = await axiosInstance.post('/natural-language-query/execute', { query });
    return response.data;
  } catch (error) {
    console.error('Error executing natural language query:', error);
    throw error;
  }
};

export const translateToSql = async (query) => {
  try {
    const response = await axiosInstance.post('/natural-language-query/translate-to-sql', { query });
    return response.data;
  } catch (error) {
    console.error('Error translating to SQL:', error);
    throw error;
  }
};

export const translateToSqlWithEvaluation = async (query) => {
  try {
    const response = await axiosInstance.post('/natural-language-query/translate-to-sql-with-evaluation', { query });
    return response.data;
  } catch (error) {
    console.error('Error translating to SQL with evaluation:', error);
    throw error;
  }
};

export const executeSqlQuery = async (sql, originalQuery) => {
  try {
    const response = await axiosInstance.post('/natural-language-query/execute-sql', { sql, originalQuery });
    return response.data;
  } catch (error) {
    console.error('Error executing SQL query:', error);
    throw error;
  }
};

// 报表生成相关API
export const generateReport = async (query) => {
  try {
    console.log('调用报表生成API，URL: /reports/generate，查询语句:', query);
    const response = await axiosInstance.post('/reports/generate', { query });
    console.log('报表生成API调用成功，状态码:', response.status, '返回数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('报表生成API调用失败:', error);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
      console.error('响应头:', error.response.headers);
    } else if (error.request) {
      console.error('没有收到响应:', error.request);
    } else {
      console.error('请求配置错误:', error.message);
    }
    throw error;
  }
};

export const getReportHistory = async () => {
  try {
    console.log('调用获取历史报表API，URL: /reports/history');
    const response = await axiosInstance.get('/reports/history');
    console.log('获取历史报表API调用成功，状态码:', response.status, '返回数据数量:', response.data?.length || 0);
    return response.data;
  } catch (error) {
    console.error('获取历史报表API调用失败:', error);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('没有收到响应:', error.request);
    } else {
      console.error('请求配置错误:', error.message);
    }
    throw error;
  }
};

export const getReportById = async (reportId) => {
  try {
    console.log('调用获取报表详情API，URL: /reports/', reportId);
    const response = await axiosInstance.get(`/reports/${reportId}`);
    console.log('获取报表详情API调用成功，状态码:', response.status, '返回数据:', response.data?.id);
    return response.data;
  } catch (error) {
    console.error(`获取报表详情API调用失败，ID: ${reportId}:`, error);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('没有收到响应:', error.request);
    } else {
      console.error('请求配置错误:', error.message);
    }
    throw error;
  }
};

export const deleteReport = async (reportId) => {
  try {
    console.log('调用删除报表API，URL: /reports/', reportId);
    const response = await axiosInstance.delete(`/reports/${reportId}`);
    console.log('删除报表API调用成功，状态码:', response.status);
    return response.data;
  } catch (error) {
    console.error(`删除报表API调用失败，ID: ${reportId}:`, error);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('没有收到响应:', error.request);
    } else {
      console.error('请求配置错误:', error.message);
    }
    throw error;
  }
};

// 数据库元数据相关API
export const fetchAllTables = async () => {
  try {
    const response = await axiosInstance.get('/database-metadata/tables');
    return response.data;
  } catch (error) {
    console.error('Error fetching all tables:', error);
    throw error;
  }
};

export const fetchTableStructure = async (tableName) => {
  try {
    const response = await axiosInstance.get(`/database-metadata/tables/${tableName}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching table structure for ${tableName}:`, error);
    throw error;
  }
};

export const fetchDatabaseDescription = async () => {
  try {
    const response = await axiosInstance.get('/database-metadata/description');
    return response.data;
  } catch (error) {
    console.error('Error fetching database description:', error);
    throw error;
  }
};

export const fetchTableRelationships = async () => {
  try {
    const response = await axiosInstance.get('/database-metadata/relationships');
    return response.data;
  } catch (error) {
    console.error('Error fetching table relationships:', error);
    throw error;
  }
};

export const fetchCompleteDatabaseStructure = async () => {
  try {
    const response = await axiosInstance.get('/database-metadata/complete');
    return response.data;
  } catch (error) {
    console.error('Error fetching complete database structure:', error);
    throw error;
  }
};