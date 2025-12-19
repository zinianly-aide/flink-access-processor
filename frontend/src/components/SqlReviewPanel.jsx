import React from 'react'
import { Card, Typography, Button, Spin, Alert } from 'antd'
import { CheckCircleOutlined, LoadingOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const SqlReviewPanel = ({
  generatedSql,
  evaluation,
  onExecute,
  loading,
  sqlGenerating,
  translationError,
  onRetryTranslate,
}) => {
  if (sqlGenerating) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} />
          <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>正在生成SQL和评估，请稍候...</p>
        </div>
      </div>
    )
  }

  if (translationError) {
    return (
      <Alert
        type="error"
        showIcon
        message="生成SQL失败"
        description={
          <Button icon={<ReloadOutlined />} onClick={onRetryTranslate} size="small">
            重新生成
          </Button>
        }
      />
    )
  }

  if (!generatedSql) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingOutlined style={{ fontSize: '48px', color: '#ccc' }} />
        <p style={{ marginTop: '16px', color: '#999' }}>请先输入查询语句，点击"生成SQL和评估"</p>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ transition: 'all 0.5s ease-in-out' }}>
      <Card className="sql-review-card">
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
            <Text strong>SQL生成成功，请检查后执行</Text>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <Title level={5} style={{ marginBottom: '8px' }}>
              生成的SQL
            </Title>
            <div className="sql-container">
              <pre>{generatedSql}</pre>
            </div>
          </div>
          <Button type="primary" onClick={onExecute} loading={loading} icon={<PlayCircleOutlined />} size="large">
            执行该SQL
          </Button>
        </div>
      </Card>

      {evaluation && (
        <div className="evaluation-card fade-in">
          <Title level={5} style={{ marginBottom: '8px', color: '#52c41a' }}>
            AI 分析评估
          </Title>
          <Text>{evaluation}</Text>
        </div>
      )}
    </div>
  )
}

export default SqlReviewPanel
