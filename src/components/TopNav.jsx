import React from 'react'
import TopNavigation from '@cloudscape-design/components/top-navigation'

export default function TopNav() {
    return (
        <TopNavigation
            identity={{
                href: '/',
                title: 'PrevWORKS',
                logo: { src: '', alt: 'PrevWORKS' } // add a logo if you have one
            }}
            i18nStrings={{
                overflowMenuTitleText: 'All',
                overflowMenuTriggerText: 'More'
            }}
            utilities={[
                { type: 'button', text: 'Resident', href: '/resident/login' },
                { type: 'button', text: 'Manager', href: '/manager/login' }
            ]}
        />
    )
}
