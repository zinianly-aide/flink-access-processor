import React, { useState, useCallback } from 'react'
import { Card, Space, message, Tabs, Typography, Tag, Alert, Row, Col, Spin } from 'antd'
import { SearchOutlined, LoadingOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { executeNaturalLanguageQuery, translateToSqlWithEvaluation, executeSqlQuery } from '../services/api'
import QueryInputArea from './QueryInputArea'
import SqlReviewPanel from './SqlReviewPanel'
import ResultsPanel from './ResultsPanel'
import QuerySidebar from './QuerySidebar'
import { useQueryContext } from '../context/QueryContext'

const { TabPane } = Tabs
const { Title, Text } = Typography

const NaturalLanguageQuery = () => {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [generatedSql, setGeneratedSql] = useState('')
  const [evaluation, setEvaluation] = useState('')
  const [activeTab, setActiveTab] = useState('result')
  const [sqlReady, setSqlReady] = useState(false)
  const [sqlGenerating, setSqlGenerating] = useState(false)
  const [queryExecuting, setQueryExecuting] = useState(false)
  const [hasExecutedQuery, setHasExecutedQuery] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [executionError, setExecutionError] = useState('')
  const [statusBanner, setStatusBanner] = useState(null)

  const { history, recentSql, addHistoryEntry, setRecentSql, setLastQuery, setLastDuration, lastDuration } = useQueryContext()

  const updateStatusBanner = useCallback((payload) => setStatusBanner(payload), [])

  const handleTranslateToSql = useCallback(async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句')
      return
    }

    setLoading(true)
    setSqlGenerating(true)
    setSqlReady(false)
    setTranslationError('')
    updateStatusBanner({
      type: 'info',
      title: '正在生成SQL',
      description: '生成期间可继续浏览其他卡片',
      icon: <LoadingOutlined spin />,
    })
    try {
      const response = await translateToSqlWithEvaluation(query)
      if (response.success && response.data) {
        const { sql = '', evaluation: evaluationText = '' } = response.data
        setGeneratedSql(sql)
        setEvaluation(evaluationText)
        setActiveTab('sql')
        setSqlReady(true)
        setRecentSql(sql)
        setLastQuery(query)
        updateStatusBanner({
          type: 'success',
          title: 'SQL 已生成',
          description: '请在审核区检查并执行',
          icon: <CheckCircleOutlined />,
        })
        message.success('SQL转换和评估成功，您可以查看并执行查询')
      } else {
        const errorMsg = response.message || '转换失败'
        setTranslationError(errorMsg)
        updateStatusBanner({
          type: 'error',
          title: '生成SQL失败',
          description: errorMsg,
          icon: <InfoCircleOutlined />,
        })
        message.error(errorMsg)
      }
    } catch (error) {
      console.error('转换失败详细信息:', error)
      const errorMsg = '转换失败，请检查网络或服务器状态'
      setTranslationError(errorMsg)
      updateStatusBanner({
        type: 'error',
        title: '生成SQL失败',
        description: errorMsg,
        icon: <InfoCircleOutlined />,
      })
      message.error(errorMsg)
    } finally {
      setLoading(false)
      setSqlGenerating(false)
    }
  }, [query, setLastQuery, setRecentSql, updateStatusBanner])

  const handleExecuteQuery = useCallback(async () => {
    if (!generatedSql && !query.trim()) {
      message.warning('请先输入查询语句并生成SQL')
      return
    }

    setLoading(true)
    setQueryExecuting(true)
    setHasExecutedQuery(false)
    setExecutionError('')
    updateStatusBanner({
      type: 'info',
      title: '正在执行查询',
      description: '执行期间不会遮挡其他卡片',
      icon: <LoadingOutlined spin />,
    })

    const startTime = performance.now()

    try {
      let response
      if (sqlReady && generatedSql) {
        response = await executeSqlQuery(generatedSql, query)
      } else {
        response = await executeNaturalLanguageQuery(query)
      }

      if (response.success && response.data) {
        const { results: payloadResults = [], evaluation: executionEvaluation = '' } = response.data
        setResults(payloadResults)
        setEvaluation((prev) => executionEvaluation || prev)
        const duration = Math.round(performance.now() - startTime)
        setLastDuration(duration)
        addHistoryEntry({
          id: Date.now(),
          query,
          sql: sqlReady ? generatedSql : '',
          timestamp: Date.now(),
          duration,
          rows: payloadResults.length,
        })
        setHasExecutedQuery(true)
        setActiveTab('result')
        updateStatusBanner({
          type: 'success',
          title: '查询执行成功',
          description: `共返回 ${payloadResults.length} 条数据，耗时 ${duration}ms`,
          icon: <CheckCircleOutlined />,
        })
        message.success(payloadResults.length > 0 ? '查询成功，返回数据' : '查询成功，暂无数据')
      } else {
        const errorMsg = response.message || '查询失败'
        setExecutionError(errorMsg)
        setHasExecutedQuery(true)
        updateStatusBanner({
          type: 'error',
          title: '查询执行失败',
          description: errorMsg,
          icon: <InfoCircleOutlined />,
        })
        message.error(errorMsg)
      }
    } catch (error) {
      console.error('查询失败详细信息:', error)
      const errorMsg = '查询失败，请检查SQL语法或网络状态'
      setExecutionError(errorMsg)
      setHasExecutedQuery(true)
      updateStatusBanner({
        type: 'error',
        title: '查询执行失败',
        description: errorMsg,
        icon: <InfoCircleOutlined />,
      })
      message.error(errorMsg)
    } finally {
      setLoading(false)
      setQueryExecuting(false)
    }
  }, [addHistoryEntry, generatedSql, query, setLastDuration, sqlReady, updateStatusBanner])

  const handleReplayRecent = useCallback(() => {
    if (recentSql) {
      setGeneratedSql(recentSql)
      setSqlReady(true)
      setActiveTab('sql')
    }
  }, [recentSql])

  const handleSelectHistory = useCallback((item) => {
    setQuery(item.query)
    if (item.sql) {
      setGeneratedSql(item.sql)
      setSqlReady(true)
      setActiveTab('sql')
    } else {
      setGeneratedSql('')
      setSqlReady(false)
    }
  }, [])

  const statusMeta = statusBanner ? {
    type: statusBanner.type,
    message: statusBanner.title,
    description: (
      <Space>
        {statusBanner.icon}
        <span>{statusBanner.description}</span>
        {lastDuration && statusBanner.type === 'success' ? <Tag color="purple">耗时 {lastDuration}ms</Tag> : null}
      </Space>
    ),
    showIcon: true,
    closable: true,
    onClose: () => setStatusBanner(null),
  } : null

  return (
    <Card title="自然语言查询" className="records-card" style={{ marginBottom: '20px' }}>
      <style>{`
        .fade-in { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px);} to { opacity: 1; transform: translateY(0);} }
        .sql-container { background-color: #f6f8fa; padding: 16px; border-radius: 4px; font-family: monospace; position: relative; min-height: 150px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
        .loading-container { display: flex; justify-content: center; align-items: center; padding: 40px; min-height: 200px; }
        .loading-content { text-align: center; }
        .sql-review-card { border: 2px solid #e6f7ff; border-radius: 8px; background-color: #f0f9ff; padding: 20px; margin-bottom: 16px; }
        .evaluation-card { background-color: #f6ffed; border: 1px solid #b7eb8f; border-radius: 4px; padding: 16px; margin-bottom: 16px; min-height: 150px; white-space: pre-wrap; word-break: break-word; }
      `}</style>

      {statusMeta && <Alert {...statusMeta} style={{ marginBottom: 12 }} />}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={17}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <QueryInputArea
              query={query}
              onQueryChange={setQuery}
              onExecute={handleExecuteQuery}
              onGenerate={handleTranslateToSql}
              loading={loading}
              sqlReady={sqlReady}
              translationError={translationError}
              executionError={executionError}
              onRetryExecute={handleExecuteQuery}
              onRetryTranslate={handleTranslateToSql}
            />

            <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: '8px' }} tabBarStyle={{ marginBottom: '12px' }}>
              <TabPane tab="查询结果" key="result">
                <ResultsPanel
                  results={results}
                  loading={loading}
                  queryExecuting={queryExecuting}
                  hasExecutedQuery={hasExecutedQuery}
                  executionError={executionError}
                />
              </TabPane>
              <TabPane tab="生成的SQL" key="sql">
                <SqlReviewPanel
                  generatedSql={generatedSql}
                  evaluation={evaluation}
                  onExecute={handleExecuteQuery}
                  loading={loading}
                  sqlGenerating={sqlGenerating}
                  translationError={translationError}
                  onRetryTranslate={handleTranslateToSql}
                />
              </TabPane>
              <TabPane tab="结果评估" key="evaluation">
                {queryExecuting ? (
                  <div className="loading-container">
                    <div className="loading-content">
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} />
                      <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>正在生成评估结果，请稍候...</p>
                    </div>
                  </div>
                ) : evaluation ? (
                  <div className="evaluation-card fade-in">
                    <Title level={5} style={{ marginBottom: '8px', color: '#52c41a' }}>AI 分析结论</Title>
                    <Text>{evaluation}</Text>
                    {generatedSql && (
                      <div style={{ marginTop: '12px' }}>
                        <Title level={5} style={{ marginBottom: '8px' }}>执行的SQL</Title>
                        <div className="sql-container">
                          <pre>{generatedSql}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : results.length > 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <SearchOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                    <p style={{ marginTop: '16px', color: '#999' }}>正在生成评估结果...</p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <SearchOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                    <p style={{ marginTop: '16px', color: '#999' }}>暂无结果评估</p>
                  </div>
                )}
              </TabPane>
            </Tabs>

            <div style={{ marginTop: '4px', padding: '16px', backgroundColor: '#f0f5ff', borderRadius: '4px' }}>
              <Title level={5} style={{ marginBottom: '8px' }}>使用示例：</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Tag color="blue">示例1</Tag>
                  <Text> 查询所有部门的总请假小时数排行</Text>
                </div>
                <div>
                  <Tag color="blue">示例2</Tag>
                  <Text> 计算各部门的净加班小时数</Text>
                </div>
                <div>
                  <Tag color="blue">示例3</Tag>
                  <Text> 查询状态为待处理的异常工时记录数量</Text>
                </div>
                <div>
                  <Tag color="blue">示例4</Tag>
                  <Text> 找出连续工作天数最多的前5名员工</Text>
                </div>
              </Space>
            </div>
          </Space>
        </Col>

        <Col xs={24} lg={7}>
          <QuerySidebar
            history={history}
            onSelect={handleSelectHistory}
            onUseTemplate={(template) => setQuery(template)}
            onReplayRecent={handleReplayRecent}
            recentSql={recentSql}
          />
          {lastDuration ? <Alert style={{ marginTop: 12 }} type="info" showIcon message={`最近执行耗时 ${lastDuration}ms`} /> : null}
        </Col>
      </Row>
    </Card>
  )
}

export default NaturalLanguageQuery
