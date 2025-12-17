import React from 'react'
import { Button, Input, Space, Alert, Typography } from 'antd'
import { PlayCircleOutlined, CodeOutlined, ReloadOutlined } from '@ant-design/icons'

const { TextArea } = Input
const { Text } = Typography

const QueryInputArea = ({
  query,
  onQueryChange,
  onExecute,
  onGenerate,
  loading,
  sqlReady,
  translationError,
  executionError,
  onRetryExecute,
  onRetryTranslate,
}) => (
  <div style={{ width: '100%' }}>
    <TextArea
      placeholder="请输入自然语言查询语句，例如：'查询所有部门的总请假小时数排行'"
      value={query}
      onChange={(e) => onQueryChange(e.target.value)}
      rows={3}
      style={{ marginBottom: '12px' }}
    />
    <Space style={{ marginBottom: '12px' }} wrap>
      <Button
        type="primary"
        onClick={onExecute}
        loading={loading}
        disabled={!sqlReady && !query.trim()}
        icon={<PlayCircleOutlined />}
        size="large"
      >
        {sqlReady ? '执行查询' : '直接执行'}
      </Button>
      <Button
        onClick={onGenerate}
        loading={loading}
        icon={<CodeOutlined />}
        size="large"
      >
        生成SQL和评估
      </Button>
    </Space>
    {(translationError || executionError) && (
      <Alert
        showIcon
        type="error"
        closable
        message="执行过程中出现问题"
        description={
          <Space direction="vertical">
            <Text type="danger">{translationError || executionError}</Text>
            <Space>
              {translationError && (
                <Button icon={<ReloadOutlined />} size="small" onClick={onRetryTranslate}>
                  重试生成
                </Button>
              )}
              {executionError && (
                <Button type="primary" icon={<ReloadOutlined />} size="small" onClick={onRetryExecute}>
                  重试执行
                </Button>
              )}
            </Space>
          </Space>
        }
      />
    )}
  </div>
)

export default QueryInputArea
