import React from 'react'
import { AppLayout, ContentLayout} from '@cloudscape-design/components'
import TopNav from './components/TopNav'
import Router from './router'

export default function App() {
    return (
        <AppLayout
            navigationHide
            toolsHide
            header={<TopNav />}
            content={<ContentLayout><Router /></ContentLayout>}
        />
    )
}
