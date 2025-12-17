import React from 'react'
import { Table, Spin, Typography, Alert } from 'antd'
import { LoadingOutlined, SearchOutlined } from '@ant-design/icons'

const { Text } = Typography

const isDateValue = (value) => {
  if (value instanceof Date) return true
  if (typeof value !== 'string') return false
  return /\d{4}-\d{2}-\d{2}/.test(value) || !Number.isNaN(Date.parse(value))
}

const formatValue = (value) => {
  if (typeof value === 'number') {
    return <Text strong type="secondary">{value}</Text>
  }
  if (isDateValue(value)) {
    const parsed = new Date(value)
    return <Text code>{Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()}</Text>
  }
  return value
}

const buildColumns = (results) => {
  if (!results.length) return []

  const firstRow = results[0]
  return Object.keys(firstRow).map((key) => {
    const sampleLength = Math.max(
      key.length,
      ...results.map((row) => `${row[key] ?? ''}`.length),
    )
    const width = Math.min(Math.max(sampleLength * 12, 120), 320)
    return {
      title: key,
      dataIndex: key,
      key,
      width,
      ellipsis: true,
      render: (text) => formatValue(text),
    }
  })
}

const ResultsPanel = ({
  results,
  loading,
  queryExecuting,
  hasExecutedQuery,
  executionError,
}) => {
  if (queryExecuting) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} />
          <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>正在执行查询，请稍候...</p>
        </div>
      </div>
    )
  }

  if (executionError) {
    return <Alert type="error" message="查询执行失败" description={executionError} showIcon />
  }

  if (!hasExecutedQuery) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <SearchOutlined style={{ fontSize: '48px', color: '#ccc' }} />
        <p style={{ marginTop: '16px', color: '#999' }}>请输入查询语句并执行查询</p>
        <p style={{ marginTop: '8px', color: '#999', fontSize: '14px' }}>或点击"生成SQL和评估"先查看生成的SQL</p>
      </div>
    )
  }

  if (!results.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
        <SearchOutlined style={{ fontSize: '48px', color: '#faad14' }} />
        <p style={{ marginTop: '16px', color: '#fa8c16' }}>查询已执行，但未返回任何结果</p>
        <p style={{ marginTop: '8px', color: '#fa8c16', fontSize: '12px' }}>请检查查询条件或尝试其他查询方式</p>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ opacity: 1, transition: 'all 0.5s ease-in-out' }}>
      <Table
        columns={buildColumns(results)}
        dataSource={results.map((item, index) => ({ ...item, key: index }))}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content', y: 360 }}
        loading={loading}
        sticky
        virtual
      />
    </div>
  )
}

export default ResultsPanel
