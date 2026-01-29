import { ref, computed } from 'vue';
import type { Deal, PipelineColumn } from '~/types';

export const useDeals = () => {
    // Initial Mock Data
    const stages = ref<PipelineColumn[]>([
        {
            id: 'new',
            label: 'New Lead',
            deals_count: 2,
            color: '#3b82f6', // blue-500
            deals: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    title: 'Enterprise License',
                    company: 'Acme Corp',
                    value: 25000,
                    currency: 'USD',
                    status: 'new',
                    type: 'B2B',
                    manager_id: 'user-1',
                    created_at: new Date('2026-01-15'),
                    ownerInitials: 'IZ',
                    probability: 10,
                    contact_name: 'John Doe',
                    contact_phone: '5551234567',
                    cemetery_name: 'Memorial Park',
                    payment_type: '2_parts',
                    permit_date: new Date('2026-02-15'),
                    last_activity_date: new Date('2026-01-28'),
                    next_activity_date: new Date('2026-01-30'),
                    next_activity_type: 'call'
                },
                {
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    title: 'Personal Coaching',
                    company: 'Starlight Inc',
                    value: 850,
                    currency: 'USD',
                    status: 'new',
                    type: 'B2C',
                    manager_id: 'user-2',
                    created_at: new Date('2026-01-20'),
                    ownerInitials: 'VT',
                    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
                    probability: 20,
                    contact_name: 'Sarah Smith',
                    contact_email: 'sarah@starlight.com',
                    contact_phone: '5559876543',
                    cemetery_name: 'Green Hills',
                    payment_type: '3_parts',
                    permit_date: new Date('2026-01-10'), // Overdue
                }
            ]
        },
        {
            id: 'contacted',
            label: 'Contacted',
            deals_count: 1,
            color: '#8b5cf6', // violet-500
            deals: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440002',
                    title: 'Basic Subscription',
                    company: 'TechStart',
                    value: 1200,
                    currency: 'USD',
                    status: 'contacted',
                    type: 'B2B',
                    manager_id: 'user-1',
                    created_at: new Date('2026-01-25'),
                    ownerInitials: 'IZ',
                    probability: 40,
                    contact_name: 'Mike Jones',
                    next_activity_date: new Date('2026-02-05'),
                    next_activity_type: 'email'
                }
            ]
        },
        {
            id: 'proposal',
            label: 'Proposal Sent',
            deals_count: 2,
            color: '#f59e0b', // amber-500
            deals: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440003',
                    title: 'Q1 Partnership',
                    company: 'Global Dynamics',
                    value: 150000,
                    currency: 'USD',
                    status: 'proposal',
                    type: 'B2B',
                    manager_id: 'user-1',
                    created_at: new Date('2025-12-10'),
                    ownerInitials: 'IZ',
                    probability: 70,
                    contact_name: 'Robert Stark',
                    last_activity_date: new Date('2026-01-25')
                },
                {
                    id: '550e8400-e29b-41d4-a716-446655440004',
                    title: 'Training Workshop',
                    company: 'EduCare',
                    value: 4500,
                    currency: 'USD',
                    status: 'proposal',
                    type: 'B2B',
                    manager_id: 'user-2',
                    created_at: new Date('2026-01-05'),
                    ownerInitials: 'VT',
                    probability: 60,
                    contact_name: 'Lisa Ray',
                    next_activity_date: new Date('2026-02-02'),
                    next_activity_type: 'meeting'
                }
            ]
        },
        {
            id: 'negotiation',
            label: 'Negotiation',
            deals_count: 0,
            color: '#ec4899', // pink-500
            deals: []
        },
        {
            id: 'won',
            label: 'Closed Won',
            deals_count: 1,
            color: '#10b981', // emerald-500
            deals: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440005',
                    title: 'Data Migration',
                    company: 'CloudSystems',
                    value: 12000,
                    currency: 'USD',
                    status: 'won',
                    type: 'B2B',
                    manager_id: 'user-1',
                    created_at: new Date('2026-01-25'),
                    ownerInitials: 'IZ',
                    probability: 100,
                    contact_name: 'David Lee',
                    contact_email: 'david@cloudsystems.io'
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
            deal.status = toStage.id as any;
            toStage.deals.push(deal);
        }
    };

    // Aggregations
    const getStageTotal = (stageId: string) => {
        const stage = stages.value.find(s => s.id === stageId);
        return stage?.deals.reduce((sum, deal) => sum + deal.value, 0) || 0;
    };

    const pipelineReport = computed(() => {
        const deals = stages.value.flatMap(s => s.deals);
        const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

        // Simple weighted forecast logic (mock probabilities)
        const probabilities: Record<string, number> = {
            new: 0.1,
            contacted: 0.3,
            proposal: 0.6,
            won: 1.0,
            lost: 0.0
        };
        const weightedValue = deals.reduce((sum, d) => sum + (d.value * (probabilities[d.status] || 0)), 0);

        return {
            period: 'Current Quarter',
            total_pipeline_value: totalValue,
            weighted_forecast: weightedValue,
            conversion_rate: 0.15 // Mock
        };
    });

    return {
        stages,
        moveDeal,
        getStageTotal,
        pipelineReport
    };
};

