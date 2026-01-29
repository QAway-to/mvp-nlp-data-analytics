import { ref } from 'vue';
import type { Deal, PipelineColumn } from '~/types';

export const useDeals = () => {
    // Initial Mock Data
    const stages = ref<PipelineColumn[]>([
        {
            id: 'new',
            label: 'New Lead',
            deals_count: 2,
            deals: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    title: 'Enterprise License',
                    company: 'Acme Corp',
                    value: 25000,
                    currency: 'USD',
                    status: 'new',
                    type: 'strategic',
                    manager_id: 'user-1',
                    created_at: new Date('2024-01-15'),
                    ownerInitials: 'IZ'
                },
                {
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    title: 'Consulting Project',
                    company: 'Starlight Inc',
                    value: 8500,
                    currency: 'USD',
                    status: 'new',
                    type: 'inbound',
                    manager_id: 'user-2',
                    created_at: new Date('2024-01-20'),
                    ownerInitials: 'VT',
                    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d'
                }
            ]
        },
        {
            id: 'contacted',
            label: 'Contacted',
            deals_count: 1,
            deals: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440002',
                    title: 'Basic Subscription',
                    company: 'TechStart',
                    value: 1200,
                    currency: 'USD',
                    status: 'contacted',
                    type: 'referral',
                    manager_id: 'user-1',
                    created_at: new Date('2024-02-01'),
                    ownerInitials: 'IZ'
                }
            ]
        },
        {
            id: 'proposal',
            label: 'Proposal Sent',
            deals_count: 2,
            deals: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440003',
                    title: 'Q1 Partnership',
                    company: 'Global Dynamics',
                    value: 150000,
                    currency: 'USD',
                    status: 'proposal',
                    type: 'strategic',
                    manager_id: 'user-1',
                    created_at: new Date('2023-12-10'),
                    ownerInitials: 'IZ'
                },
                {
                    id: '550e8400-e29b-41d4-a716-446655440004',
                    title: 'Training Workshop',
                    company: 'EduCare',
                    value: 4500,
                    currency: 'USD',
                    status: 'proposal',
                    type: 'outbound',
                    manager_id: 'user-2',
                    created_at: new Date('2024-01-05'),
                    ownerInitials: 'VT'
                }
            ]
        },
        {
            id: 'won',
            label: 'Closed Won',
            deals_count: 1,
            deals: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440005',
                    title: 'Data Migration',
                    company: 'CloudSystems',
                    value: 12000,
                    currency: 'USD',
                    status: 'won',
                    type: 'inbound',
                    manager_id: 'user-1',
                    created_at: new Date('2024-01-25'),
                    ownerInitials: 'IZ'
                }
            ]
        }
    ]);

    const moveDeal = (deal: Deal, fromStageId: string, toStageId: string) => {
        if (fromStageId === toStageId) return;

        const fromStage = stages.value.find(s => s.id === fromStageId);
        const toStage = stages.value.find(s => s.id === toStageId);

        if (fromStage && toStage) {
            fromStage.deals = fromStage.deals.filter(d => d.id !== deal.id);
            // Update deal status locally to match target stage
            // We use 'as any' because pipeline IDs might loosely match status enum
            deal.status = toStage.id as any;
            toStage.deals.push(deal);
        }
    };

    return {
        stages,
        moveDeal
    };
};
