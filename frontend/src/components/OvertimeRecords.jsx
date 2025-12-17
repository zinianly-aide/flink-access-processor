import React, { useState, useEffect } from 'react';
import { Table, Card, Button, message, DatePicker, Space, Input, Row, Col } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchOvertimeRecordsByPage } from '../services/api';

const { RangePicker } = DatePicker;
const { Search } = Input;

const OvertimeRecords = () => {
  const [overtimeRecords, setOvertimeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 获取加班记录
  useEffect(() => {
    const loadOvertimeRecords = async () => {
      try {
        setLoading(true);
        const data = await fetchOvertimeRecordsByPage(currentPage, pageSize, searchText);
        setOvertimeRecords(data.data);
        setTotal(data.total);
      } catch (error) {
        message.error('获取加班记录失败');
      } finally {
        setLoading(false);
      }
    };

    loadOvertimeRecords();
  }, [currentPage, pageSize, searchText]);

  // 处理日期范围变化
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    // 这里可以添加根据日期范围过滤数据的逻辑
  };

  // 处理搜索
  const handleSearch = (value) => {
    setSearchText(value);
    setCurrentPage(1); // 搜索时重置到第一页
  };

  // 处理分页变化
  const handlePaginationChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  // 导出Excel功能
  const exportToExcel = async () => {
    try {
      const response = await fetch('http://localhost:8082/api/overtime-records/export/excel', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'overtime_records.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        message.success('导出成功');
      } else {
        throw new Error('导出失败');
      }
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 加班记录表列配置
  const overtimeColumns = [
    {
      title: '员工ID',
      dataIndex: 'emp_id',
      key: 'emp_id',
      width: 120,
      sorter: (a, b) => a.emp_id - b.emp_id,
    },
    {
      title: '工作日期',
      dataIndex: 'work_date',
      key: 'work_date',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.work_date) - new Date(b.work_date),
    },
    {
      title: '实际工作小时',
      dataIndex: 'actual_hours',
      key: 'actual_hours',
      width: 150,
      sorter: (a, b) => a.actual_hours - b.actual_hours,
    },
    {
      title: '正常工作小时',
      dataIndex: 'regular_hours',
      key: 'regular_hours',
      width: 150,
      sorter: (a, b) => a.regular_hours - b.regular_hours,
    },
    {
      title: '加班小时',
      dataIndex: 'overtime_hours',
      key: 'overtime_hours',
      width: 120,
      sorter: (a, b) => a.overtime_hours - b.overtime_hours,
      render: (hours) => (
        <span style={{ color: hours > 0 ? '#ff7875' : '#52c41a' }}>
          {hours}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => new Date(time).toLocaleString(),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
  ];

  return (
    <Card 
      title="加班记录" 
      className="records-card"
      extra={
        <Space>
          <RangePicker 
            onChange={handleDateRangeChange} 
            placeholder={['开始日期', '结束日期']}
          />
          <Button 
            type="primary" 
            onClick={exportToExcel}
            icon={<DownloadOutlined />}
          >
            导出Excel
          </Button>
        </Space>
      }
    >
      {/* 搜索区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Search
            placeholder="搜索所有字段..."
            allowClear
            enterButton={<SearchOutlined />}
            size="middle"
            onSearch={handleSearch}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>
      
      <Table
        columns={overtimeColumns}
        dataSource={overtimeRecords}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: handlePaginationChange,
          onShowSizeChange: handlePaginationChange,
        }}
        scroll={{ x: 800 }}
      />
    </Card>
  );
};

export default OvertimeRecords;